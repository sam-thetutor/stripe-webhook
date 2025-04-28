module {
    public type Transaction = {
        destinationAddress: Text;
        paymentLinkId: Text;
        usdAmount: Text;
        tokenSymbol: Text;
        destinationCanisterId: Text;
        tokenAmount: Text;
        isPaid: Bool;
        swapTxId:?Text;
        fromAmount:?Text;
        toAmount:?Text;
        price:?Text;
        slippage:?Text;
        error:?Text;
    };
    
};