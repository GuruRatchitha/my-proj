export const summaryCards = [
  {
    type: 'balance',
    eyebrow: 'Total balance',
    value: '$771,601',
    detail: '$12,420 this month',
    icon: 'eye',
  },
  {
    eyebrow: 'Accounts',
    value: '3',
    detail: 'Savings - Checking - Investment',
  },
  {
    eyebrow: 'Completed',
    value: '4',
    detail: 'Cleared transactions',
    status: 'success',
  },
  {
    eyebrow: 'Pending',
    value: '1',
    detail: '1 awaiting review',
    status: 'warning',
  },
]

export const accounts = [
  {
    id: 'AC-9921',
    type: 'Savings',
    amount: '$184,520.45',
  },
  {
    id: 'AC-8412',
    type: 'Checking',
    amount: '$24,180.10',
  },
  {
    id: 'AC-7305',
    type: 'Investment',
    amount: '$562,900.00',
  },
  {
    id: 'AC-6218',
    type: 'Salary',
    amount: '$86,340.20',
  },
  {
    id: 'AC-5190',
    type: 'Fixed deposit',
    amount: '$310,000.00',
  },
]

export const transactions = [
  {
    name: 'Stripe Payouts',
    detail: 'TXN-10293 - ACH',
    date: 'Jun 16, 2026',
    status: 'Completed',
    amount: '$4,250.00',
    tone: 'credit',
    icon: 'arrow-down',
  },
  {
    name: 'Amazon AWS',
    detail: 'TXN-10292 - Card',
    date: 'Jun 15, 2026',
    status: 'Completed',
    amount: '$812.40',
    tone: 'debit',
    icon: 'arrow-up-right',
  },
  {
    name: 'Vanguard Index Fund',
    detail: 'TXN-10291 - Wire',
    date: 'Jun 14, 2026',
    status: 'Pending',
    amount: '$10,000.00',
    tone: 'debit',
    icon: 'arrow-left-right',
  },
  {
    name: 'Shopify Capital',
    detail: 'TXN-10290 - ACH',
    date: 'Jun 12, 2026',
    status: 'Completed',
    amount: '$2,180.60',
    tone: 'credit',
    icon: 'arrow-down',
  },
  {
    name: 'Payroll Batch',
    detail: 'TXN-10289 - Payroll',
    date: 'Jun 10, 2026',
    status: 'Failed',
    amount: '$6,420.00',
    tone: 'debit',
    icon: 'exclamation-triangle',
  },
]
