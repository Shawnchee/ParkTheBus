mod common;
use common::*;

use parkthebus::state::*;
use solana_signer::Signer;

/// Happy path: initialize -> MM funds vault -> bettor posts RFQ -> MM quotes ->
/// bettor accepts. Asserts collateral math + that the pot is actually escrowed.
#[test]
fn test_full_match_flow() {
    let mut env = Env::new(2);
    let council = env.council_pubkeys();
    let authority = env.funded(100);

    env.send1(ix_initialize(&authority.pubkey(), council, 2), &authority)
        .expect("initialize");

    let cfg: Config = env.account(&config_pda());
    assert_eq!(cfg.council.len(), 2);
    assert_eq!(cfg.threshold, 2);
    assert_eq!(cfg.rfq_counter, 0);

    let bettor = env.funded(10);
    let mm = env.funded(10);

    // MM funds vault with 1 SOL of collateral capacity
    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm)
        .expect("deposit_collateral");
    let vault = mm_vault_pda(&mm.pubkey());
    let vault_after_deposit = env.lamports(&vault);

    // bettor posts a standard RFQ: 0.5 SOL stake, min 2.4x
    let stake = 500_000_000;
    let min_odds = 24_000;
    env.send1(
        ix_post_rfq(&bettor.pubkey(), 0, standard_rfq_args(stake, min_odds)),
        &bettor,
    )
    .expect("post_rfq");

    let rfq: RfqAccount = env.account(&rfq_pda(0));
    assert_eq!(rfq.status, RfqStatus::Open);
    assert_eq!(rfq.approval_status, ApprovalStatus::AutoApproved);
    assert_eq!(rfq.stake, stake);
    assert_eq!(rfq.deposit, parkthebus::constants::RFQ_DEPOSIT_LAMPORTS);
    assert!(env.lamports(&rfq_pda(0)) >= parkthebus::constants::RFQ_DEPOSIT_LAMPORTS);

    // MM quotes 2.4x exactly
    env.send1(ix_submit_quote(&mm.pubkey(), 0, 24_000), &mm)
        .expect("submit_quote");
    let quote: QuoteAccount = env.account(&quote_pda(&rfq_pda(0), &mm.pubkey()));
    assert_eq!(quote.offered_odds_bps, 24_000);
    assert_eq!(quote.collateral_required, 700_000_000); // 0.5 * (2.4 - 1)
    assert_eq!(quote.status, QuoteStatus::Pending);

    let rfq: RfqAccount = env.account(&rfq_pda(0));
    assert_eq!(rfq.quote_count, 1);

    // bettor accepts
    env.send1(ix_accept_quote(&bettor.pubkey(), 0, &mm.pubkey()), &bettor)
        .expect("accept_quote");

    let rfq: RfqAccount = env.account(&rfq_pda(0));
    assert_eq!(rfq.status, RfqStatus::Matched);
    assert_eq!(rfq.accepted_mm, Some(mm.pubkey()));
    let quote: QuoteAccount = env.account(&quote_pda(&rfq_pda(0), &mm.pubkey()));
    assert_eq!(quote.status, QuoteStatus::Accepted);

    let pos: PositionAccount = env.account(&position_pda(&rfq_pda(0)));
    assert_eq!(pos.stake, 500_000_000);
    assert_eq!(pos.collateral, 700_000_000);
    assert_eq!(pos.payout_amount, 1_200_000_000); // 0.5 * 2.4
    assert_eq!(pos.matched_odds_bps, 24_000);
    assert_eq!(pos.status, PositionStatus::Matched);

    // collateral was pulled from the vault (exactly 0.7 SOL)
    assert_eq!(
        vault_after_deposit - env.lamports(&mm_vault_pda(&mm.pubkey())),
        700_000_000
    );
    // escrow account holds at least the full payout
    assert!(env.lamports(&position_pda(&rfq_pda(0))) >= 1_200_000_000);
}

#[test]
fn test_quote_below_min_odds_rejected() {
    let mut env = Env::new(2);
    let council = env.council_pubkeys();
    let authority = env.funded(100);
    env.send1(ix_initialize(&authority.pubkey(), council, 2), &authority)
        .unwrap();

    let bettor = env.funded(10);
    let mm = env.funded(10);
    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm).unwrap();
    env.send1(
        ix_post_rfq(&bettor.pubkey(), 0, standard_rfq_args(500_000_000, 24_000)),
        &bettor,
    )
    .unwrap();

    // 2.0x < required 2.4x
    let res = env.send1(ix_submit_quote(&mm.pubkey(), 0, 20_000), &mm);
    expect_log(res, "Quote odds do not meet the RFQ minimum");
}

#[test]
fn test_accept_insufficient_collateral_fails() {
    let mut env = Env::new(2);
    let council = env.council_pubkeys();
    let authority = env.funded(100);
    env.send1(ix_initialize(&authority.pubkey(), council, 2), &authority)
        .unwrap();

    let bettor = env.funded(10);
    let mm = env.funded(10);
    // vault holds only 0.1 SOL but collateral needed is 0.7 SOL
    env.send1(ix_deposit_collateral(&mm.pubkey(), 100_000_000), &mm).unwrap();
    env.send1(
        ix_post_rfq(&bettor.pubkey(), 0, standard_rfq_args(500_000_000, 24_000)),
        &bettor,
    )
    .unwrap();
    env.send1(ix_submit_quote(&mm.pubkey(), 0, 24_000), &mm).unwrap();

    let res = env.send1(ix_accept_quote(&bettor.pubkey(), 0, &mm.pubkey()), &bettor);
    expect_log(res, "insufficient free collateral");
}

#[test]
fn test_double_accept_fails() {
    let mut env = Env::new(2);
    let council = env.council_pubkeys();
    let authority = env.funded(100);
    env.send1(ix_initialize(&authority.pubkey(), council, 2), &authority)
        .unwrap();

    let bettor = env.funded(10);
    let mm = env.funded(10);
    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm).unwrap();
    env.send1(
        ix_post_rfq(&bettor.pubkey(), 0, standard_rfq_args(500_000_000, 24_000)),
        &bettor,
    )
    .unwrap();
    env.send1(ix_submit_quote(&mm.pubkey(), 0, 24_000), &mm).unwrap();
    env.send1(ix_accept_quote(&bettor.pubkey(), 0, &mm.pubkey()), &bettor)
        .expect("first accept");

    let res = env.send1(ix_accept_quote(&bettor.pubkey(), 0, &mm.pubkey()), &bettor);
    assert!(res.is_err(), "second accept on a matched RFQ must fail");
}

#[test]
fn test_custom_event_waits_for_council() {
    let mut env = Env::new(2);
    let council = env.council_pubkeys();
    let authority = env.funded(100);
    env.send1(ix_initialize(&authority.pubkey(), council, 2), &authority)
        .unwrap();

    let bettor = env.funded(10);
    let mm = env.funded(10);
    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm).unwrap();

    // custom event -> PendingApproval, not Open
    let mut args = standard_rfq_args(200_000_000, 50_000);
    args.event_type = EventType::Custom;
    args.event_description = "Ronaldo to cry".to_string();
    env.send1(ix_post_rfq(&bettor.pubkey(), 0, args), &bettor).unwrap();

    let rfq: RfqAccount = env.account(&rfq_pda(0));
    assert_eq!(rfq.status, RfqStatus::PendingApproval);
    assert_eq!(rfq.approval_status, ApprovalStatus::Pending);

    // can't quote a market that isn't open yet
    let res = env.send1(ix_submit_quote(&mm.pubkey(), 0, 50_000), &mm);
    expect_log(res, "RFQ is not open");
}

#[test]
fn test_zero_collateral_quote_rejected() {
    let mut env = Env::new(2);
    let council = env.council_pubkeys();
    let authority = env.funded(100);
    env.send1(ix_initialize(&authority.pubkey(), council, 2), &authority)
        .unwrap();

    let bettor = env.funded(10);
    let mm = env.funded(10);
    env.send1(ix_deposit_collateral(&mm.pubkey(), SOL), &mm).unwrap();

    // 1-lamport stake at 1.0001x -> payout floors to 1 -> collateral 0
    env.send1(
        ix_post_rfq(&bettor.pubkey(), 0, standard_rfq_args(1, 10_001)),
        &bettor,
    )
    .unwrap();

    let res = env.send1(ix_submit_quote(&mm.pubkey(), 0, 10_001), &mm);
    expect_log(res, "Collateral rounds to zero");
}
