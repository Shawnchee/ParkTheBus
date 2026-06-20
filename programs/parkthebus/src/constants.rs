use anchor_lang::prelude::*;

/// Odds are expressed in basis points where `10_000` = 1.0x.
/// (e.g. even money 2.0x = `20_000`, 2.4x = `24_000`).
pub const ODDS_BPS_ONE: u64 = 10_000;

/// Spam-prevention deposit every RFQ must post (PRD §10 Rule 1): 0.01 SOL.
pub const RFQ_DEPOSIT_LAMPORTS: u64 = 10_000_000;

/// Bounds for on-chain strings (keeps accounts small + rent cheap).
pub const MAX_MATCH_ID_LEN: usize = 32;
pub const MAX_EVENT_DESC_LEN: usize = 96;
pub const MAX_EVIDENCE_URI_LEN: usize = 128;

/// Parlay: up to 4 legs per RFQ (PRD §8).
pub const MAX_PARLAY_LEGS: usize = 4;

/// Maximum council size the Config account can hold (MVP uses 2, scalable to 9).
pub const MAX_COUNCIL: usize = 9;

// ---- PDA seeds -------------------------------------------------------------
#[constant]
pub const CONFIG_SEED: &[u8] = b"config";
#[constant]
pub const MM_VAULT_SEED: &[u8] = b"mm_vault";
#[constant]
pub const RFQ_SEED: &[u8] = b"rfq";
#[constant]
pub const QUOTE_SEED: &[u8] = b"quote";
#[constant]
pub const POSITION_SEED: &[u8] = b"position";
#[constant]
pub const SETTLEMENT_SEED: &[u8] = b"settlement";
#[constant]
pub const REPUTATION_SEED: &[u8] = b"reputation";
