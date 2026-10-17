/**
 * 金额工具：内部一律使用整数「分」（cents）计算，避免浮点误差。
 *
 * 页面上用户输入的金额最多两位小数；历史数据里可能存在负数（退款/冲正），
 * 迁移与统计时按原符号保留，新表单只允许正数。
 */

/** 单笔金额上限：99,999,999.99 元 */
export const MAX_AMOUNT_CENTS = 9_999_999_999

export interface FormatCentsOptions {
  /** 正数是否显示 + 号 */
  sign?: boolean
  /** 是否使用千分位，默认 true */
  grouping?: boolean
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label}不正确`)
}

function groupInteger(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

/**
 * 将「元」转换为「分」。
 * - 字符串按十进制逐位解析，支持最多两位小数；
 * - 数字入参按四舍五入到分处理（用于旧接口/历史数据）。
 */
export function decimalToCents(input: number | string): number {
  if (typeof input === "number") {
    assertFinite(input, "金额")
    return Math.round(input * 100)
  }

  const text = String(input ?? "").trim()
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) {
    throw new Error("金额格式不正确")
  }

  const negative = text.startsWith("-")
  const unsigned = text.replace(/^[+-]/, "")
  const [integerPart, fractionPart = ""] = unsigned.split(".")
  if (fractionPart.length > 2) {
    throw new Error("金额最多两位小数")
  }

  const integer = Number(integerPart)
  assertFinite(integer, "金额")
  const cents = integer * 100 + Number(`${fractionPart}00`.slice(0, 2))
  assertFinite(cents, "金额")
  if (Math.abs(cents) > MAX_AMOUNT_CENTS) {
    throw new Error("金额过大")
  }
  return negative ? -cents : cents
}

/** 历史数据兼容：允许三位以上小数/浮点误差，直接四舍五入到分 */
export function roundAmountToCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100)
}

/** 用户输入校验：正数、最多两位小数、不能为 0 */
export function parseUserAmountToCents(input: number | string): number {
  const text = typeof input === "number" ? String(input) : String(input ?? "").trim()
  if (!/^\d+(\.\d+)?$/.test(text)) {
    if (/^\d+\.\d{3,}$/.test(text)) {
      throw new Error("金额最多两位小数")
    }
    throw new Error("金额格式不正确")
  }
  if (/^\d+\.\d{3,}$/.test(text)) {
    throw new Error("金额最多两位小数")
  }
  const cents = decimalToCents(text)
  if (cents <= 0) {
    throw new Error("金额必须大于 0")
  }
  return cents
}

function parseOperandToCents(text: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error("算式格式不正确")
  }
  return decimalToCents(text)
}

/**
 * 计算器表达式求值：支持 + 和 -，不使用 eval。
 * 每个操作数最多两位小数，结果以分返回。
 */
export function evaluateAmountExpression(expression: string): number {
  const text = String(expression ?? "").replace(/\s+/g, "")
  if (!text) {
    throw new Error("请输入金额")
  }
  if (!/^[+-]?\d+(\.\d{1,2})?([+-]\d+(\.\d{1,2})?)*$/.test(text)) {
    throw new Error("算式格式不正确")
  }

  const terms = text.match(/[+-]?[^+-]+/g) || []
  let total = 0
  for (const term of terms) {
    const negative = term.startsWith("-")
    const body = term.replace(/^[+-]/, "")
    const cents = parseOperandToCents(body)
    total += negative ? -cents : cents
  }

  if (Math.abs(total) > MAX_AMOUNT_CENTS) {
    throw new Error("金额过大")
  }
  return total
}

/** 分 → 元（用于写回旧 amount 列） */
export function centsToAmount(cents: number): number {
  assertFinite(cents, "金额")
  return Math.round(cents) / 100
}

/** 格式化分为两位小数字符串 */
export function formatCents(cents: number, options: FormatCentsOptions = {}): string {
  assertFinite(cents, "金额")
  const rounded = Math.round(cents)
  const negative = rounded < 0
  const abs = Math.abs(rounded)
  const yuan = Math.floor(abs / 100)
  const fen = abs % 100
  const sign = negative ? "-" : options.sign && rounded > 0 ? "+" : ""
  const yuanText = options.grouping === false ? String(yuan) : groupInteger(String(yuan))
  return `${sign}${yuanText}.${String(fen).padStart(2, "0")}`
}

/** 列表展示：支出显示负号，收入显示正号；历史负支出会显示为正（退款） */
export function formatRecordAmount(cents: number, type: "income" | "expense"): string {
  const signed = type === "expense" ? -cents : cents
  return formatCents(signed, { sign: true })
}
