import Types "Types";
import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";

actor class StorageCanister() {



    private stable var transactionStore : [(Text, Types.Transaction)] = [];
    let transactionMap = HashMap.fromIter<Text, Types.Transaction>(transactionStore.vals(), 0, Text.equal, Text.hash);
    // let owner = Principal.fromText("2qx77-qkq77-2qx77-qkq77");



    public shared({caller}) func storeTransaction(transaction : Types.Transaction) : async Bool {
        //assert(caller == owner)
        transactionMap.put(transaction.paymentLinkId, transaction);
        return true;
    };

    //check the payment status iof the transaction
    public func checkPaymentStatus(transactionId : Text) : async Bool {
        switch (transactionMap.get(transactionId)) {
            case (null) {
                return false;
            };
            case (?transaction) {
                return transaction.isPaid;
            };
        };
    };

    //update the transaction with the swap details
    public func updateTransaction(transactionId : Text, transaction : Types.Transaction) : async Bool {
        transactionMap.put(transactionId, transaction);
        return true;
    };

    //get the transaction details
    public query func getTransaction(transactionId : Text) : async ?Types.Transaction {
        return transactionMap.get(transactionId);
    };

    //get all the transaction in the canister
    public query func getAllTransactions() : async [(Text, Types.Transaction)] {
        return Iter.toArray(transactionMap.entries());
    };

    system func preupgrade() {
        transactionStore := Iter.toArray(transactionMap.entries());
    };
    system func postupgrade() {
        transactionStore := []
    };
    
};