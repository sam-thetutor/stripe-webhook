export const idlFactory = ({ IDL }) => {
  const Transaction = IDL.Record({
    'fromAmount' : IDL.Opt(IDL.Text),
    'destinationAddress' : IDL.Text,
    'usdAmount' : IDL.Text,
    'isPaid' : IDL.Bool,
    'tokenAmount' : IDL.Text,
    'error' : IDL.Opt(IDL.Text),
    'tokenSymbol' : IDL.Text,
    'swapTxId' : IDL.Opt(IDL.Text),
    'destinationCanisterId' : IDL.Text,
    'price' : IDL.Opt(IDL.Text),
    'toAmount' : IDL.Opt(IDL.Text),
    'paymentLinkId' : IDL.Text,
    'slippage' : IDL.Opt(IDL.Text),
  });
  const StorageCanister = IDL.Service({
    'checkPaymentStatus' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'getAllTransactions' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, Transaction))],
        ['query'],
      ),
    'getTransaction' : IDL.Func([IDL.Text], [IDL.Opt(Transaction)], ['query']),
    'storeTransaction' : IDL.Func([Transaction], [IDL.Bool], []),
    'updateTransaction' : IDL.Func([IDL.Text, Transaction], [IDL.Bool], []),
  });
  return StorageCanister;
};
export const init = ({ IDL }) => { return []; };
