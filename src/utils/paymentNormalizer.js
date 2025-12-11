export function normalizePaymentStatus(gateway, data) {
  gateway = gateway.toLowerCase();

  switch (gateway) {
    /* ---------------------------------------------------------
     *  RAZORPAY
     * --------------------------------------------------------- */
    case "razorpay":
      return {
        status: mapStatus(data.status),
        method: data.method,
        orderId: data.order_id,
        paymentId: data.id,
        raw: data,
      };

    /* ---------------------------------------------------------
     *  STRIPE
     * --------------------------------------------------------- */
    case "stripe":
      return {
        status: mapStatusStripe(data.status),
        method: data.payment_method_types?.[0],
        orderId: data.metadata?.order_id,
        paymentId: data.id,
        raw: data,
      };

    /* ---------------------------------------------------------
     *  PHONEPE
     * --------------------------------------------------------- */
    case "phonepe":
      return {
        status: mapStatusPhonePe(data.code),
        method: data.paymentMethod,
        orderId: data.orderId,
        paymentId: data.transactionId,
        raw: data,
      };

    /* ---------------------------------------------------------
     *  CASHFREE
     * --------------------------------------------------------- */
    case "cashfree":
      return {
        status: mapStatusCashfree(data.payment_status),
        method: data.payment_method,
        orderId: data.order_id,
        paymentId: data.cf_payment_id,
        raw: data,
      };

    default:
      return {
        status: "failed",
        method: null,
        orderId: null,
        paymentId: null,
        raw: data,
      };
  }
}

/* ---------------------------------------------------------
 *  RAZORPAY STATUS MAP
 * --------------------------------------------------------- */
function mapStatus(status) {
  const map = {
    created: "created",
    authorized: "authorized",
    captured: "captured",
    failed: "failed",
    refunded: "refunded",
  };
  return map[status] ?? "failed";
}

/* ---------------------------------------------------------
 *  STRIPE STATUS MAP
 * --------------------------------------------------------- */
function mapStatusStripe(status) {
  const map = {
    requires_payment_method: "failed",
    requires_confirmation: "created",
    processing: "authorized",
    requires_capture: "authorized",
    succeeded: "captured",
    canceled: "failed",
  };
  return map[status] ?? "failed";
}

/* ---------------------------------------------------------
 *  PHONEPE STATUS MAP
 * --------------------------------------------------------- */
function mapStatusPhonePe(status) {
  const map = {
    PAYMENT_SUCCESS: "success",
    PAYMENT_PENDING: "created",
    PAYMENT_DECLINED: "failed",
    PAYMENT_ERROR: "failed",
    REFUND_SUCCESS: "refunded",
  };
  return map[status] ?? "failed";
}

/* ---------------------------------------------------------
 *  CASHFREE STATUS MAP
 * --------------------------------------------------------- */
function mapStatusCashfree(status) {
  const map = {
    SUCCESS: "captured",
    FAILED: "failed",
    PENDING: "created",
    CANCELLED: "failed",
    REFUNDED: "refunded",
  };
  return map[status] ?? "failed";
}
