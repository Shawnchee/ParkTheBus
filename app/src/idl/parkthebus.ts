/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/parkthebus.json`.
 */
export type Parkthebus = {
  "address": "6xzNc5rA9bMi8DzH1ZMp1CKrnC51XvurYTX5ygaGqm2i",
  "metadata": {
    "name": "parkthebus",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "acceptQuote",
      "docs": [
        "Bettor accepts a quote: escrows stake + pulls MM collateral, opens a position."
      ],
      "discriminator": [
        129,
        61,
        5,
        81,
        46,
        253,
        210,
        152
      ],
      "accounts": [
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.rfq_id",
                "account": "rfqAccount"
              }
            ]
          }
        },
        {
          "name": "quote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "account",
                "path": "marketMaker"
              }
            ]
          }
        },
        {
          "name": "marketMaker"
        },
        {
          "name": "mmVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "marketMaker"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "bettor",
          "writable": true,
          "signer": true,
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "approveMarket",
      "docs": [
        "Council member approves/rejects a custom-event RFQ awaiting review."
      ],
      "discriminator": [
        195,
        83,
        73,
        224,
        150,
        237,
        150,
        5
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.rfq_id",
                "account": "rfqAccount"
              }
            ]
          }
        },
        {
          "name": "councilMember",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "approved",
          "type": "bool"
        }
      ]
    },
    {
      "name": "cancelRfq",
      "docs": [
        "Bettor cancels an unmatched RFQ (refunds deposit + rent)."
      ],
      "discriminator": [
        65,
        47,
        228,
        229,
        50,
        93,
        212,
        236
      ],
      "accounts": [
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.rfq_id",
                "account": "rfqAccount"
              }
            ]
          }
        },
        {
          "name": "bettor",
          "writable": true,
          "signer": true,
          "relations": [
            "rfq"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "depositCollateral",
      "docs": [
        "Market maker tops up their collateral vault (quotes stay free)."
      ],
      "discriminator": [
        156,
        131,
        142,
        116,
        146,
        247,
        162,
        120
      ],
      "accounts": [
        {
          "name": "mmVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "marketMaker"
              }
            ]
          }
        },
        {
          "name": "marketMaker",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "executeSettlement",
      "docs": [
        "Permissionless: release escrow once a settlement has the required votes."
      ],
      "discriminator": [
        237,
        120,
        82,
        62,
        224,
        193,
        147,
        137
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.rfq_id",
                "account": "rfqAccount"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "settlement",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "bettor",
          "writable": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "marketMaker",
          "writable": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "bettorRep",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  112,
                  117,
                  116,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bettor"
              }
            ]
          }
        },
        {
          "name": "mmRep",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  112,
                  117,
                  116,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "marketMaker"
              }
            ]
          }
        },
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "expireRfq",
      "docs": [
        "Permissionless crank: clean up an expired, unmatched RFQ (refunds the bettor)."
      ],
      "discriminator": [
        231,
        183,
        186,
        79,
        195,
        167,
        30,
        23
      ],
      "accounts": [
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.rfq_id",
                "account": "rfqAccount"
              }
            ]
          }
        },
        {
          "name": "bettor",
          "writable": true,
          "relations": [
            "rfq"
          ]
        },
        {
          "name": "cranker",
          "docs": [
            "Whoever cranks the expiry (pays the tx fee)."
          ],
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "docs": [
        "One-time setup: registers the council + vote threshold and the RFQ counter."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "council",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "threshold",
          "type": "u8"
        }
      ]
    },
    {
      "name": "postRfq",
      "docs": [
        "Bettor posts an RFQ (locks the spam-prevention deposit)."
      ],
      "discriminator": [
        214,
        57,
        240,
        30,
        68,
        131,
        117,
        222
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "config.rfq_counter",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "bettor",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "postRfqArgs"
            }
          }
        }
      ]
    },
    {
      "name": "recordLegResult",
      "docs": [
        "Council member records one parlay leg's result (Won/Lost) as matches play."
      ],
      "discriminator": [
        202,
        17,
        230,
        130,
        76,
        231,
        45,
        145
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.rfq_id",
                "account": "rfqAccount"
              }
            ]
          }
        },
        {
          "name": "position",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "councilMember",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "legIndex",
          "type": "u8"
        },
        {
          "name": "won",
          "type": "bool"
        }
      ]
    },
    {
      "name": "signSettlement",
      "docs": [
        "Council member votes on a matched position's outcome (threshold-gated)."
      ],
      "discriminator": [
        248,
        106,
        168,
        68,
        73,
        154,
        171,
        250
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rfq",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.rfq_id",
                "account": "rfqAccount"
              }
            ]
          }
        },
        {
          "name": "position",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "settlement",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              }
            ]
          }
        },
        {
          "name": "councilMember",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": {
            "defined": {
              "name": "settlementOutcome"
            }
          }
        },
        {
          "name": "evidenceUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "submitQuote",
      "docs": [
        "Market maker submits a free competing quote."
      ],
      "discriminator": [
        230,
        121,
        122,
        202,
        228,
        6,
        91,
        181
      ],
      "accounts": [
        {
          "name": "rfq",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  102,
                  113
                ]
              },
              {
                "kind": "account",
                "path": "rfq.rfq_id",
                "account": "rfqAccount"
              }
            ]
          }
        },
        {
          "name": "quote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "rfq"
              },
              {
                "kind": "account",
                "path": "marketMaker"
              }
            ]
          }
        },
        {
          "name": "marketMaker",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "offeredOddsBps",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "mmVault",
      "discriminator": [
        222,
        94,
        182,
        238,
        210,
        74,
        166,
        35
      ]
    },
    {
      "name": "positionAccount",
      "discriminator": [
        60,
        125,
        250,
        193,
        181,
        109,
        238,
        86
      ]
    },
    {
      "name": "quoteAccount",
      "discriminator": [
        177,
        222,
        119,
        223,
        178,
        170,
        167,
        139
      ]
    },
    {
      "name": "reputationAccount",
      "discriminator": [
        19,
        185,
        177,
        157,
        34,
        87,
        67,
        233
      ]
    },
    {
      "name": "rfqAccount",
      "discriminator": [
        109,
        52,
        198,
        232,
        95,
        22,
        57,
        251
      ]
    },
    {
      "name": "settlementAccount",
      "discriminator": [
        81,
        42,
        104,
        111,
        123,
        89,
        146,
        180
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidCouncilSize",
      "msg": "Council size must be between 1 and MAX_COUNCIL"
    },
    {
      "code": 6001,
      "name": "invalidThreshold",
      "msg": "Threshold must be a strict majority of the council and not exceed its size"
    },
    {
      "code": 6002,
      "name": "duplicateCouncilMember",
      "msg": "Council contains duplicate members"
    },
    {
      "code": 6003,
      "name": "badPositionInvariant",
      "msg": "Position payout does not equal stake + collateral (invariant broken)"
    },
    {
      "code": 6004,
      "name": "oddsTooLow",
      "msg": "Odds must be strictly greater than 1.0x (10000 bps)"
    },
    {
      "code": 6005,
      "name": "collateralTooLow",
      "msg": "Collateral rounds to zero — increase stake or odds margin"
    },
    {
      "code": 6006,
      "name": "marketNotApproved",
      "msg": "Market is not approved for quoting"
    },
    {
      "code": 6007,
      "name": "invalidKickoff",
      "msg": "Kickoff must be unset (0) or in the future"
    },
    {
      "code": 6008,
      "name": "invalidStake",
      "msg": "Stake must be greater than zero"
    },
    {
      "code": 6009,
      "name": "stringTooLong",
      "msg": "A string field exceeds its maximum length"
    },
    {
      "code": 6010,
      "name": "invalidExpiry",
      "msg": "Expiry must be in the future"
    },
    {
      "code": 6011,
      "name": "rfqNotOpen",
      "msg": "RFQ is not open for this action"
    },
    {
      "code": 6012,
      "name": "rfqAlreadyMatched",
      "msg": "RFQ has already been matched"
    },
    {
      "code": 6013,
      "name": "rfqExpired",
      "msg": "RFQ has expired"
    },
    {
      "code": 6014,
      "name": "quoteBelowMinOdds",
      "msg": "Quote odds do not meet the RFQ minimum"
    },
    {
      "code": 6015,
      "name": "kickoffPassed",
      "msg": "Kickoff has passed; no new quotes or matches accepted"
    },
    {
      "code": 6016,
      "name": "insufficientCollateral",
      "msg": "Market maker has insufficient free collateral in their vault"
    },
    {
      "code": 6017,
      "name": "quoteNotPending",
      "msg": "Quote is not in a pending state"
    },
    {
      "code": 6018,
      "name": "mathOverflow",
      "msg": "Numerical overflow"
    },
    {
      "code": 6019,
      "name": "withdrawExceedsBalance",
      "msg": "Withdraw amount exceeds free (unreserved) vault balance"
    },
    {
      "code": 6020,
      "name": "notCouncilMember",
      "msg": "Caller is not a council member"
    },
    {
      "code": 6021,
      "name": "alreadyVoted",
      "msg": "Council member has already voted on this settlement"
    },
    {
      "code": 6022,
      "name": "councilMemberExcluded",
      "msg": "Council member is excluded from this market (has a position in it)"
    },
    {
      "code": 6023,
      "name": "thresholdNotMet",
      "msg": "Settlement has not reached the required vote threshold"
    },
    {
      "code": 6024,
      "name": "positionNotMatched",
      "msg": "Position is not in the expected state for settlement"
    },
    {
      "code": 6025,
      "name": "resultMismatch",
      "msg": "Settlement result does not match this position's event"
    },
    {
      "code": 6026,
      "name": "notPendingApproval",
      "msg": "RFQ is not awaiting council approval"
    },
    {
      "code": 6027,
      "name": "settlementAlreadyExecuted",
      "msg": "Settlement has already been executed"
    },
    {
      "code": 6028,
      "name": "outcomeMismatch",
      "msg": "Vote outcome does not match the proposed settlement outcome"
    },
    {
      "code": 6029,
      "name": "rfqNotExpired",
      "msg": "RFQ has not expired yet"
    },
    {
      "code": 6030,
      "name": "cannotCancelMatched",
      "msg": "Cannot cancel an RFQ that is already matched or settled"
    },
    {
      "code": 6031,
      "name": "invalidParlay",
      "msg": "Invalid parlay: needs 2-4 pending legs (or none for a single bet)"
    },
    {
      "code": 6032,
      "name": "notAParlay",
      "msg": "This RFQ is not a parlay"
    },
    {
      "code": 6033,
      "name": "legIndexOutOfRange",
      "msg": "Parlay leg index out of range"
    }
  ],
  "types": [
    {
      "name": "approvalStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "autoApproved"
          },
          {
            "name": "councilApproved"
          },
          {
            "name": "pending"
          },
          {
            "name": "rejected"
          }
        ]
      }
    },
    {
      "name": "config",
      "docs": [
        "Singleton program configuration + global RFQ counter + council registry."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "council",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "threshold",
            "docs": [
              "Votes required to settle (strict majority; 2-of-2 for MVP)."
            ],
            "type": "u8"
          },
          {
            "name": "rfqCounter",
            "docs": [
              "Monotonic id assigned to each new RFQ."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "eventType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "standard"
          },
          {
            "name": "custom"
          }
        ]
      }
    },
    {
      "name": "legResult",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "won"
          },
          {
            "name": "lost"
          }
        ]
      }
    },
    {
      "name": "mmVault",
      "docs": [
        "Per-market-maker collateral vault. Program-owned so `accept_quote` can debit",
        "it without the MM's signature. Holds rent + free collateral as native lamports;",
        "the struct itself is intentionally tiny."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketMaker",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "parlayLeg",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "eventDescription",
            "type": "string"
          },
          {
            "name": "result",
            "type": {
              "defined": {
                "name": "legResult"
              }
            }
          }
        ]
      }
    },
    {
      "name": "positionAccount",
      "docs": [
        "Created on a match. Holds the entire pot (stake + collateral = payout) as",
        "native lamports; the winner takes all at settlement."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfqId",
            "type": "u64"
          },
          {
            "name": "bettor",
            "type": "pubkey"
          },
          {
            "name": "marketMaker",
            "type": "pubkey"
          },
          {
            "name": "stake",
            "type": "u64"
          },
          {
            "name": "collateral",
            "type": "u64"
          },
          {
            "name": "matchedOddsBps",
            "type": "u64"
          },
          {
            "name": "payoutAmount",
            "docs": [
              "stake + collateral; held as lamports in this account above rent."
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "positionStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "positionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "matched"
          },
          {
            "name": "settledBettorWin"
          },
          {
            "name": "settledMmWin"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "postRfqArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "string"
          },
          {
            "name": "eventDescription",
            "type": "string"
          },
          {
            "name": "eventType",
            "type": {
              "defined": {
                "name": "eventType"
              }
            }
          },
          {
            "name": "stake",
            "type": "u64"
          },
          {
            "name": "minOddsBps",
            "type": "u64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "kickoffAt",
            "docs": [
              "0 = no kickoff lockout for this market."
            ],
            "type": "i64"
          },
          {
            "name": "isParlay",
            "type": "bool"
          },
          {
            "name": "parlayLegs",
            "type": {
              "vec": {
                "defined": {
                  "name": "parlayLeg"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "quoteAccount",
      "docs": [
        "A free competing quote from a market maker on one RFQ.",
        "PDA seed = [\"quote\", rfq, market_maker] => one (improvable) quote per MM per RFQ."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfqId",
            "type": "u64"
          },
          {
            "name": "marketMaker",
            "type": "pubkey"
          },
          {
            "name": "offeredOddsBps",
            "type": "u64"
          },
          {
            "name": "collateralRequired",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "quoteStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "quoteStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "accepted"
          },
          {
            "name": "rejected"
          },
          {
            "name": "expired"
          }
        ]
      }
    },
    {
      "name": "reputationAccount",
      "docs": [
        "Per-wallet on-chain reputation (seed [\"reputation\", wallet]). Created lazily",
        "at first settlement."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "marketsAsMm",
            "type": "u64"
          },
          {
            "name": "marketsAsBettor",
            "type": "u64"
          },
          {
            "name": "totalVolumeLamports",
            "type": "u64"
          },
          {
            "name": "mmWins",
            "type": "u64"
          },
          {
            "name": "mmLosses",
            "type": "u64"
          },
          {
            "name": "disputesInvolved",
            "type": "u64"
          },
          {
            "name": "isCouncilMember",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "rfqAccount",
      "docs": [
        "A Request For Quote posted by a bettor. Also escrows the spam-prevention",
        "deposit (0.01 SOL) as native lamports inside this account."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfqId",
            "type": "u64"
          },
          {
            "name": "bettor",
            "type": "pubkey"
          },
          {
            "name": "matchId",
            "type": "string"
          },
          {
            "name": "eventDescription",
            "type": "string"
          },
          {
            "name": "eventType",
            "type": {
              "defined": {
                "name": "eventType"
              }
            }
          },
          {
            "name": "stake",
            "type": "u64"
          },
          {
            "name": "minOddsBps",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "rfqStatus"
              }
            }
          },
          {
            "name": "approvalStatus",
            "type": {
              "defined": {
                "name": "approvalStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "kickoffAt",
            "docs": [
              "Kickoff timestamp; no quotes/accepts allowed at or after this (Rule 5). 0 = unset."
            ],
            "type": "i64"
          },
          {
            "name": "isParlay",
            "type": "bool"
          },
          {
            "name": "parlayLegs",
            "type": {
              "vec": {
                "defined": {
                  "name": "parlayLeg"
                }
              }
            }
          },
          {
            "name": "deposit",
            "type": "u64"
          },
          {
            "name": "quoteCount",
            "type": "u32"
          },
          {
            "name": "acceptedMm",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "rfqStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pendingApproval"
          },
          {
            "name": "open"
          },
          {
            "name": "matched"
          },
          {
            "name": "settled"
          },
          {
            "name": "expired"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "settlementAccount",
      "docs": [
        "One settlement per position (seed [\"settlement\", rfq]). Council members vote",
        "on a single proposed outcome; once `vote_count >= config.threshold` the escrow",
        "can be released by anyone via `execute_settlement`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfqId",
            "type": "u64"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "settlementOutcome"
              }
            }
          },
          {
            "name": "voters",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "voteCount",
            "type": "u8"
          },
          {
            "name": "evidenceUri",
            "type": "string"
          },
          {
            "name": "executed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "settlementOutcome",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "bettorWins"
          },
          {
            "name": "mmWins"
          },
          {
            "name": "void"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "configSeed",
      "type": "bytes",
      "value": "[99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "mmVaultSeed",
      "type": "bytes",
      "value": "[109, 109, 95, 118, 97, 117, 108, 116]"
    },
    {
      "name": "positionSeed",
      "type": "bytes",
      "value": "[112, 111, 115, 105, 116, 105, 111, 110]"
    },
    {
      "name": "quoteSeed",
      "type": "bytes",
      "value": "[113, 117, 111, 116, 101]"
    },
    {
      "name": "reputationSeed",
      "type": "bytes",
      "value": "[114, 101, 112, 117, 116, 97, 116, 105, 111, 110]"
    },
    {
      "name": "rfqSeed",
      "type": "bytes",
      "value": "[114, 102, 113]"
    },
    {
      "name": "settlementSeed",
      "type": "bytes",
      "value": "[115, 101, 116, 116, 108, 101, 109, 101, 110, 116]"
    }
  ]
};
