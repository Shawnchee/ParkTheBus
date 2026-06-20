// Glob re-exports are required: the `#[program]`/`#[derive(Accounts)]` macros
// generate helper modules (`__client_accounts_*`, `__cpi_client_accounts_*`)
// that must be reachable from the crate root. The only ambiguity this creates is
// the per-module `handler` fn, which we always call via its full path, so this
// warning is benign.
#![allow(ambiguous_glob_reexports)]

pub mod accept_quote;
pub mod approve_market;
pub mod cancel_rfq;
pub mod deposit_collateral;
pub mod execute_settlement;
pub mod expire_rfq;
pub mod initialize;
pub mod post_rfq;
pub mod record_leg_result;
pub mod sign_settlement;
pub mod submit_quote;

pub use accept_quote::*;
pub use approve_market::*;
pub use cancel_rfq::*;
pub use deposit_collateral::*;
pub use execute_settlement::*;
pub use expire_rfq::*;
pub use initialize::*;
pub use post_rfq::*;
pub use record_leg_result::*;
pub use sign_settlement::*;
pub use submit_quote::*;
