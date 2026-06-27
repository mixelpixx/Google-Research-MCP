//! Lenient deserializers for tool parameters.
//!
//! Some MCP clients serialize numbers and booleans as JSON strings
//! (e.g. `"5"` instead of `5`, `"true"` instead of `true`). The strict serde
//! defaults reject these, surfacing as `invalid type: string "5", expected u32`.
//! These helpers accept either the native JSON type or a stringified form so a
//! reasonable request never fails on a type technicality. The advertised JSON
//! schema is unchanged (still integer / boolean) — we just tolerate more input.

use serde::{Deserialize, Deserializer};
use serde_json::Value;

/// Coerce an optional JSON value into `Option<u64>`, accepting numbers and
/// numeric strings. Empty string / null / absent → `None`.
fn coerce_opt_u64<E: serde::de::Error>(v: Option<Value>) -> Result<Option<u64>, E> {
    match v {
        None | Some(Value::Null) => Ok(None),
        Some(Value::Number(n)) => {
            if let Some(u) = n.as_u64() {
                Ok(Some(u))
            } else if let Some(f) = n.as_f64() {
                if f >= 0.0 {
                    Ok(Some(f as u64))
                } else {
                    Err(E::custom(format!("expected a non-negative number, got {f}")))
                }
            } else {
                Err(E::custom("number out of range"))
            }
        }
        Some(Value::String(s)) => {
            let t = s.trim();
            if t.is_empty() {
                return Ok(None);
            }
            if let Ok(u) = t.parse::<u64>() {
                Ok(Some(u))
            } else if let Ok(f) = t.parse::<f64>() {
                if f >= 0.0 {
                    Ok(Some(f as u64))
                } else {
                    Err(E::custom(format!("expected a non-negative number, got \"{s}\"")))
                }
            } else {
                Err(E::custom(format!("could not parse \"{s}\" as a number")))
            }
        }
        Some(other) => Err(E::custom(format!(
            "expected a number or numeric string, got {other}"
        ))),
    }
}

/// Lenient `Option<u32>`: accepts `5`, `"5"`, `5.0`, `""`/null → `None`.
pub fn de_opt_u32<'de, D>(d: D) -> Result<Option<u32>, D::Error>
where
    D: Deserializer<'de>,
{
    let v = Option::<Value>::deserialize(d)?;
    Ok(coerce_opt_u64::<D::Error>(v)?.map(|n| n.min(u32::MAX as u64) as u32))
}

/// Lenient `Option<usize>`: accepts `2000`, `"2000"`, `""`/null → `None`.
pub fn de_opt_usize<'de, D>(d: D) -> Result<Option<usize>, D::Error>
where
    D: Deserializer<'de>,
{
    let v = Option::<Value>::deserialize(d)?;
    Ok(coerce_opt_u64::<D::Error>(v)?.map(|n| n as usize))
}

/// Lenient `Option<bool>`: accepts `true`, `"true"`, `"1"`, `"yes"`, `1`,
/// and their false-y counterparts. Empty string / null / absent → `None`.
pub fn de_opt_bool<'de, D>(d: D) -> Result<Option<bool>, D::Error>
where
    D: Deserializer<'de>,
{
    use serde::de::Error;
    let v = Option::<Value>::deserialize(d)?;
    match v {
        None | Some(Value::Null) => Ok(None),
        Some(Value::Bool(b)) => Ok(Some(b)),
        Some(Value::Number(n)) => Ok(Some(n.as_f64().map(|f| f != 0.0).unwrap_or(false))),
        Some(Value::String(s)) => {
            let t = s.trim().to_ascii_lowercase();
            match t.as_str() {
                "" => Ok(None),
                "true" | "1" | "yes" | "y" | "on" => Ok(Some(true)),
                "false" | "0" | "no" | "n" | "off" => Ok(Some(false)),
                _ => Err(D::Error::custom(format!(
                    "could not parse \"{s}\" as a boolean"
                ))),
            }
        }
        Some(other) => Err(D::Error::custom(format!(
            "expected a boolean or boolean string, got {other}"
        ))),
    }
}
