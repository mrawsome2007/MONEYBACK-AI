const money = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount || 0));

export function detectOpportunities(record, allRecords = []) {
  const results = [];
  const amount = Number(record.amount || 0);

  if (record.purchaseDate && record.productName) {
    results.push({
      id: `${record.id}-warranty`,
      type: "Warranty support enquiry",
      status: "Needs verification",
      potentialAmount: amount,
      reason: `You have a purchase record for ${record.productName}. If the product has a valid warranty and a covered fault, a support enquiry may be worth exploring.`,
      missing: ["Warranty duration and terms", "Reported product issue", "Serial number or model", "Seller/brand support details"],
      nextStep: "Review the warranty card or the brand's official warranty page. Confirm eligibility before making a claim."
    });
  }

  if (record.purchaseDate && amount > 0) {
    results.push({
      id: `${record.id}-return`,
      type: "Return/refund window check",
      status: "Needs verification",
      potentialAmount: amount,
      reason: `The purchase amount is ${money(amount, record.currency || "INR")}. Check the seller's return/refund policy and whether the item and purchase date meet its conditions.`,
      missing: ["Seller's return policy", "Delivery date, if relevant", "Item condition", "Order/return eligibility"],
      nextStep: "Check the seller's official order page and return policy. This app has not verified eligibility."
    });
  }

  const similar = allRecords.filter((other) =>
    other.id !== record.id &&
    String(other.merchant || "").trim().toLowerCase() === String(record.merchant || "").trim().toLowerCase() &&
    Number(other.amount || 0) === amount &&
    record.purchaseDate && other.purchaseDate === record.purchaseDate
  );

  if (similar.length > 0) {
    results.push({
      id: `${record.id}-duplicate`,
      type: "Possible duplicate payment",
      status: "Needs manual verification",
      potentialAmount: amount,
      reason: `Another saved record has the same merchant, amount and purchase date. This similarity alone does not prove a duplicate debit.`,
      missing: ["Bank/provider statement", "Transaction IDs", "Confirmation that both amounts were debited"],
      nextStep: "Compare the entries with your bank or payment-provider statement. Contact the provider if both debits are confirmed."
    });
  }

  return results;
}
