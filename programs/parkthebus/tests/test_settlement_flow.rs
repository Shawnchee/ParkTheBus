mod common;
use common::*;

use parkthebus::state::*;
use solana_keypair::Keypair;
use solana_signer::Signer;

const STAKE: u64 = 500_000_000; // 0.5 SOL
const PAYOUT: u64 = 1_200_000_000; // 0.5 * 2.4
const COLLATERAL: u64 = 700_000_000; // 0.5 * 1.4
const DEPOSIT: u64 = 10_000_000; // 0.01 SOL

/// initialize with the given council keypairs (threshold = council size).
fn init(env: &mut Env, councils: &[&Keypair]) {
    let pks: Vec<_> = councils.iter().map(|k| k.pubkey()).collect();
    let authority = env.funded(100);
    env.send1(
        ix_initialize(&authority.pubkey(), pks, councils.len() as u8),
        &authority,
    )
    .expect("initialize");
}

/// Post RFQ #0, quote, accept -> returns (bettor, mm), both funded.
fn matched(env: &mut Env) -> (Keypair, Keypair) {
    let bettor = env.funded(10);
    let mm = env.funded(10);
    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm).unwrap();
    env.send1(
        ix_post_rfq(&bettor.pubkey(), 0, standard_rfq_args(STAKE, 24_000)),
        &bettor,
    )
    .unwrap();
    env.send1(ix_submit_quote(&mm.pubkey(), 0, 24_000), &mm).unwrap();
    env.send1(ix_accept_quote(&bettor.pubkey(), 0, &mm.pubkey()), &bettor)
        .unwrap();
    (bettor, mm)
}

#[test]
fn test_settle_bettor_wins() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);
    let (bettor, mm) = matched(&mut env);
    let cranker = env.funded(10);

    env.send1(
        ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::BettorWins, "src://result"),
        &c0,
    )
    .expect("vote 1");
    env.send1(
        ix_sign_settlement(&c1.pubkey(), 0, SettlementOutcome::BettorWins, ""),
        &c1,
    )
    .expect("vote 2");

    let bettor_before = env.lamports(&bettor.pubkey());
    let mm_before = env.lamports(&mm.pubkey());
    env.send1(
        ix_execute_settlement(0, &bettor.pubkey(), &mm.pubkey(), &cranker.pubkey()),
        &cranker,
    )
    .expect("execute");

    // bettor receives the full pot (+ deposit refund + position rent)
    assert!(env.lamports(&bettor.pubkey()) - bettor_before >= PAYOUT);
    // MM gets nothing on a loss
    assert_eq!(env.lamports(&mm.pubkey()), mm_before);
    // escrow position closed
    assert!(!env.exists(&position_pda(&rfq_pda(0))));

    let rfq: RfqAccount = env.account(&rfq_pda(0));
    assert_eq!(rfq.status, RfqStatus::Settled);
    assert_eq!(rfq.deposit, 0);

    let s: SettlementAccount = env.account(&settlement_pda(&rfq_pda(0)));
    assert!(s.executed);
    assert_eq!(s.vote_count, 2);

    let brep: ReputationAccount = env.account(&reputation_pda(&bettor.pubkey()));
    assert_eq!(brep.markets_as_bettor, 1);
    let mrep: ReputationAccount = env.account(&reputation_pda(&mm.pubkey()));
    assert_eq!(mrep.markets_as_mm, 1);
    assert_eq!(mrep.mm_losses, 1);
    assert_eq!(mrep.mm_wins, 0);
}

#[test]
fn test_settle_mm_wins() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);
    let (bettor, mm) = matched(&mut env);
    let cranker = env.funded(10);

    env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::MmWins, ""), &c0).unwrap();
    env.send1(ix_sign_settlement(&c1.pubkey(), 0, SettlementOutcome::MmWins, ""), &c1).unwrap();

    let mm_before = env.lamports(&mm.pubkey());
    let bettor_before = env.lamports(&bettor.pubkey());
    env.send1(
        ix_execute_settlement(0, &bettor.pubkey(), &mm.pubkey(), &cranker.pubkey()),
        &cranker,
    )
    .unwrap();

    assert!(env.lamports(&mm.pubkey()) - mm_before >= PAYOUT);
    // bettor still gets the deposit (+ rent) back even on a loss
    assert!(env.lamports(&bettor.pubkey()) - bettor_before >= DEPOSIT);
    assert!(!env.exists(&position_pda(&rfq_pda(0))));

    let mrep: ReputationAccount = env.account(&reputation_pda(&mm.pubkey()));
    assert_eq!(mrep.mm_wins, 1);
    assert_eq!(mrep.mm_losses, 0);
}

#[test]
fn test_void_refunds_both() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);
    let (bettor, mm) = matched(&mut env);
    let cranker = env.funded(10);

    env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::Void, ""), &c0).unwrap();
    env.send1(ix_sign_settlement(&c1.pubkey(), 0, SettlementOutcome::Void, ""), &c1).unwrap();

    let bettor_before = env.lamports(&bettor.pubkey());
    let mm_before = env.lamports(&mm.pubkey());
    env.send1(
        ix_execute_settlement(0, &bettor.pubkey(), &mm.pubkey(), &cranker.pubkey()),
        &cranker,
    )
    .unwrap();

    // bettor refunded stake (+ deposit + rent), MM refunded collateral
    assert!(env.lamports(&bettor.pubkey()) - bettor_before >= STAKE);
    assert!(env.lamports(&mm.pubkey()) - mm_before >= COLLATERAL);
    assert!(!env.exists(&position_pda(&rfq_pda(0))));
}

#[test]
fn test_threshold_not_met() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);
    let (bettor, mm) = matched(&mut env);
    let cranker = env.funded(10);

    // only one of two votes
    env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::BettorWins, ""), &c0).unwrap();

    let res = env.send1(
        ix_execute_settlement(0, &bettor.pubkey(), &mm.pubkey(), &cranker.pubkey()),
        &cranker,
    );
    expect_log(res, "vote threshold");
}

#[test]
fn test_council_member_excluded() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let bettor = env.funded(10);
    let mm = env.funded(10);
    // MM is also a council member -> must be excluded from judging its own market
    init(&mut env, &[&c0, &mm]);

    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm).unwrap();
    env.send1(ix_post_rfq(&bettor.pubkey(), 0, standard_rfq_args(STAKE, 24_000)), &bettor).unwrap();
    env.send1(ix_submit_quote(&mm.pubkey(), 0, 24_000), &mm).unwrap();
    env.send1(ix_accept_quote(&bettor.pubkey(), 0, &mm.pubkey()), &bettor).unwrap();

    let res = env.send1(
        ix_sign_settlement(&mm.pubkey(), 0, SettlementOutcome::MmWins, ""),
        &mm,
    );
    expect_log(res, "excluded");
}

#[test]
fn test_double_vote_rejected() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);
    let _ = matched(&mut env);

    // distinct evidence strings => distinct txs (so LiteSVM doesn't dedup by signature)
    env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::BettorWins, "first"), &c0).unwrap();
    let res = env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::BettorWins, "again"), &c0);
    expect_log(res, "already voted");
}

#[test]
fn test_non_council_cannot_vote() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);
    let _ = matched(&mut env);

    let outsider = env.funded(10);
    let res = env.send1(
        ix_sign_settlement(&outsider.pubkey(), 0, SettlementOutcome::BettorWins, ""),
        &outsider,
    );
    expect_log(res, "not a council member");
}

#[test]
fn test_outcome_mismatch_rejected() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);
    let _ = matched(&mut env);

    env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::BettorWins, ""), &c0).unwrap();
    let res = env.send1(ix_sign_settlement(&c1.pubkey(), 0, SettlementOutcome::MmWins, ""), &c1);
    expect_log(res, "does not match");
}

#[test]
fn test_cancel_rfq_refunds_deposit() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);

    let bettor = env.funded(10);
    env.send1(ix_post_rfq(&bettor.pubkey(), 0, standard_rfq_args(STAKE, 24_000)), &bettor).unwrap();
    assert!(env.exists(&rfq_pda(0)));

    let before = env.lamports(&bettor.pubkey());
    env.send1(ix_cancel_rfq(&bettor.pubkey(), 0), &bettor).unwrap();
    // deposit + rent returned
    assert!(env.lamports(&bettor.pubkey()) - before >= DEPOSIT);
    assert!(!env.exists(&rfq_pda(0)));
}

#[test]
fn test_custom_market_council_approval_path() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);

    let bettor = env.funded(10);
    let mm = env.funded(10);
    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm).unwrap();

    let mut args = standard_rfq_args(200_000_000, 50_000);
    args.event_type = EventType::Custom;
    args.event_description = "Ronaldo to cry".to_string();
    env.send1(ix_post_rfq(&bettor.pubkey(), 0, args), &bettor).unwrap();

    // pending -> a council member approves -> Open
    env.send1(ix_approve_market(&c0.pubkey(), 0, true), &c0).unwrap();
    let rfq: RfqAccount = env.account(&rfq_pda(0));
    assert_eq!(rfq.status, RfqStatus::Open);
    assert_eq!(rfq.approval_status, ApprovalStatus::CouncilApproved);

    // now quotable + matchable
    env.send1(ix_submit_quote(&mm.pubkey(), 0, 50_000), &mm).unwrap();
    env.send1(ix_accept_quote(&bettor.pubkey(), 0, &mm.pubkey()), &bettor).unwrap();
    let pos: PositionAccount = env.account(&position_pda(&rfq_pda(0)));
    assert_eq!(pos.status, PositionStatus::Matched);
}

#[test]
fn test_duplicate_council_rejected() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let authority = env.funded(100);
    // same key registered twice -> rejected
    let res = env.send1(
        ix_initialize(&authority.pubkey(), vec![c0.pubkey(), c0.pubkey()], 2),
        &authority,
    );
    expect_log(res, "duplicate");
}

#[test]
fn test_approve_market_requires_council() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init(&mut env, &[&c0, &c1]);

    let bettor = env.funded(10);
    let mut args = standard_rfq_args(200_000_000, 50_000);
    args.event_type = EventType::Custom;
    env.send1(ix_post_rfq(&bettor.pubkey(), 0, args), &bettor).unwrap();

    let outsider = env.funded(10);
    let res = env.send1(ix_approve_market(&outsider.pubkey(), 0, true), &outsider);
    expect_log(res, "not a council member");
}
