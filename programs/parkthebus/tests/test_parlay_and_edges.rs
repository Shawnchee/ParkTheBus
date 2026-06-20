mod common;
use common::*;

use parkthebus::state::*;
use solana_keypair::Keypair;
use solana_signer::Signer;

const P_STAKE: u64 = 100_000_000; // 0.1 SOL
const P_ODDS: u64 = 60_000; // 6.0x combined
const P_PAYOUT: u64 = 600_000_000; // 0.1 * 6.0
const DEPOSIT: u64 = 10_000_000;

fn init2(env: &mut Env, c0: &Keypair, c1: &Keypair) {
    let authority = env.funded(100);
    env.send1(
        ix_initialize(&authority.pubkey(), vec![c0.pubkey(), c1.pubkey()], 2),
        &authority,
    )
    .expect("initialize");
}

/// Post + match a 3-leg parlay as RFQ #0. Returns (bettor, mm).
fn match_parlay(env: &mut Env) -> (Keypair, Keypair) {
    let bettor = env.funded(10);
    let mm = env.funded(10);
    env.send1(ix_deposit_collateral(&mm.pubkey(), 2 * SOL), &mm).unwrap();
    env.send1(
        ix_post_rfq(&bettor.pubkey(), 0, parlay_rfq_args(P_STAKE, P_ODDS, 3)),
        &bettor,
    )
    .unwrap();
    env.send1(ix_submit_quote(&mm.pubkey(), 0, P_ODDS), &mm).unwrap();
    env.send1(ix_accept_quote(&bettor.pubkey(), 0, &mm.pubkey()), &bettor).unwrap();
    (bettor, mm)
}

#[test]
fn test_parlay_all_legs_won_bettor_wins() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init2(&mut env, &c0, &c1);
    let (bettor, mm) = match_parlay(&mut env);

    // council records all 3 legs Won
    for i in 0..3u8 {
        env.send1(ix_record_leg_result(&c0.pubkey(), 0, i, true), &c0).unwrap();
    }
    env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::BettorWins, "all"), &c0).unwrap();
    env.send1(ix_sign_settlement(&c1.pubkey(), 0, SettlementOutcome::BettorWins, ""), &c1).unwrap();

    let cranker = env.funded(10);
    let before = env.lamports(&bettor.pubkey());
    env.send1(
        ix_execute_settlement(0, &bettor.pubkey(), &mm.pubkey(), &cranker.pubkey()),
        &cranker,
    )
    .unwrap();

    assert!(env.lamports(&bettor.pubkey()) - before >= P_PAYOUT);
    let rfq: RfqAccount = env.account(&rfq_pda(0));
    assert_eq!(rfq.status, RfqStatus::Settled);
    assert!(rfq.parlay_legs.iter().all(|l| l.result == LegResult::Won));
}

#[test]
fn test_parlay_one_leg_lost_mm_wins() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init2(&mut env, &c0, &c1);
    let (bettor, mm) = match_parlay(&mut env);

    env.send1(ix_record_leg_result(&c0.pubkey(), 0, 0, true), &c0).unwrap();
    env.send1(ix_record_leg_result(&c0.pubkey(), 0, 1, false), &c0).unwrap(); // lost
    env.send1(ix_record_leg_result(&c0.pubkey(), 0, 2, true), &c0).unwrap();

    env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::MmWins, "leg1 lost"), &c0).unwrap();
    env.send1(ix_sign_settlement(&c1.pubkey(), 0, SettlementOutcome::MmWins, ""), &c1).unwrap();

    let cranker = env.funded(10);
    let before = env.lamports(&mm.pubkey());
    env.send1(
        ix_execute_settlement(0, &bettor.pubkey(), &mm.pubkey(), &cranker.pubkey()),
        &cranker,
    )
    .unwrap();
    assert!(env.lamports(&mm.pubkey()) - before >= P_PAYOUT);
}

#[test]
fn test_parlay_bettor_wins_rejected_when_leg_lost() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init2(&mut env, &c0, &c1);
    let (bettor, mm) = match_parlay(&mut env);

    // one leg lost, but council (wrongly) votes BettorWins
    env.send1(ix_record_leg_result(&c0.pubkey(), 0, 0, true), &c0).unwrap();
    env.send1(ix_record_leg_result(&c0.pubkey(), 0, 1, false), &c0).unwrap();
    env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::BettorWins, ""), &c0).unwrap();
    env.send1(ix_sign_settlement(&c1.pubkey(), 0, SettlementOutcome::BettorWins, "x"), &c1).unwrap();

    let cranker = env.funded(10);
    // on-chain enforcement: a lost leg blocks a bettor payout
    let res = env.send1(
        ix_execute_settlement(0, &bettor.pubkey(), &mm.pubkey(), &cranker.pubkey()),
        &cranker,
    );
    expect_log(res, "does not match this position");
}

#[test]
fn test_parlay_bettor_wins_requires_all_legs_resolved() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init2(&mut env, &c0, &c1);
    let (bettor, mm) = match_parlay(&mut env);

    // only 2 of 3 legs recorded won; leg 2 still Pending
    env.send1(ix_record_leg_result(&c0.pubkey(), 0, 0, true), &c0).unwrap();
    env.send1(ix_record_leg_result(&c0.pubkey(), 0, 1, true), &c0).unwrap();
    env.send1(ix_sign_settlement(&c0.pubkey(), 0, SettlementOutcome::BettorWins, ""), &c0).unwrap();
    env.send1(ix_sign_settlement(&c1.pubkey(), 0, SettlementOutcome::BettorWins, "y"), &c1).unwrap();

    let cranker = env.funded(10);
    let res = env.send1(
        ix_execute_settlement(0, &bettor.pubkey(), &mm.pubkey(), &cranker.pubkey()),
        &cranker,
    );
    expect_log(res, "does not match this position");
}

#[test]
fn test_invalid_parlay_one_leg_rejected() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init2(&mut env, &c0, &c1);
    let bettor = env.funded(10);

    // is_parlay with a single leg -> invalid
    let res = env.send1(
        ix_post_rfq(&bettor.pubkey(), 0, parlay_rfq_args(P_STAKE, P_ODDS, 1)),
        &bettor,
    );
    expect_log(res, "Invalid parlay");
}

// ---- clock-based edge cases ------------------------------------------------

#[test]
fn test_accept_after_expiry_rejected() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init2(&mut env, &c0, &c1);
    let bettor = env.funded(10);
    let mm = env.funded(10);
    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm).unwrap();

    let now = env.now();
    let mut args = standard_rfq_args(500_000_000, 24_000);
    args.expires_at = now + 100;
    env.send1(ix_post_rfq(&bettor.pubkey(), 0, args), &bettor).unwrap();
    env.send1(ix_submit_quote(&mm.pubkey(), 0, 24_000), &mm).unwrap();

    env.warp_unix(now + 200); // past expiry
    let res = env.send1(ix_accept_quote(&bettor.pubkey(), 0, &mm.pubkey()), &bettor);
    expect_log(res, "RFQ has expired");
}

#[test]
fn test_quote_after_kickoff_rejected() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init2(&mut env, &c0, &c1);
    let bettor = env.funded(10);
    let mm = env.funded(10);
    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm).unwrap();

    let now = env.now();
    let mut args = standard_rfq_args(500_000_000, 24_000);
    args.kickoff_at = now + 100;
    args.expires_at = now + 1000;
    env.send1(ix_post_rfq(&bettor.pubkey(), 0, args), &bettor).unwrap();

    env.warp_unix(now + 200); // past kickoff, before expiry
    let res = env.send1(ix_submit_quote(&mm.pubkey(), 0, 24_000), &mm);
    expect_log(res, "Kickoff has passed");
}

#[test]
fn test_expire_rfq_crank() {
    let mut env = Env::new(0);
    let c0 = env.funded(10);
    let c1 = env.funded(10);
    init2(&mut env, &c0, &c1);
    let bettor = env.funded(10);
    let cranker = env.funded(10);

    let now = env.now();
    let mut args = standard_rfq_args(500_000_000, 24_000);
    args.expires_at = now + 100;
    env.send1(ix_post_rfq(&bettor.pubkey(), 0, args), &bettor).unwrap();

    // too early to expire
    let res = env.send1(ix_expire_rfq(&bettor.pubkey(), &cranker.pubkey(), 0), &cranker);
    expect_log(res, "has not expired");

    // warp past expiry, then anyone can crank -> deposit refunded to bettor
    env.warp_unix(now + 200);
    let before = env.lamports(&bettor.pubkey());
    env.send1(ix_expire_rfq(&bettor.pubkey(), &cranker.pubkey(), 0), &cranker).unwrap();
    assert!(env.lamports(&bettor.pubkey()) - before >= DEPOSIT);
    assert!(!env.exists(&rfq_pda(0)));
}
