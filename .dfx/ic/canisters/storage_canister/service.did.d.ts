import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface StorageCanister {
  'checkPaymentStatus' : ActorMethod<[string], boolean>,
  'getAllTransactions' : ActorMethod<[], Array<[string, Transaction]>>,
  'getTransaction' : ActorMethod<[string], [] | [Transaction]>,
  'storeTransaction' : ActorMethod<[Transaction], boolean>,
  'updateTransaction' : ActorMethod<[string, Transaction], boolean>,
}
export interface Transaction {
  'fromAmount' : [] | [string],
  'destinationAddress' : string,
  'usdAmount' : string,
  'isPaid' : boolean,
  'tokenAmount' : string,
  'error' : [] | [string],
  'tokenSymbol' : string,
  'swapTxId' : [] | [string],
  'destinationCanisterId' : string,
  'price' : [] | [string],
  'toAmount' : [] | [string],
  'paymentLinkId' : string,
  'slippage' : [] | [string],
}
export interface _SERVICE extends StorageCanister {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
