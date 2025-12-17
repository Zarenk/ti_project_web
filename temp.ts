let createdInvoice: { id: number } | null = null;
(async () => {
  createdInvoice = { id: 1 };
})();
if (createdInvoice) {
  const invoiceForSunat = createdInvoice;
  try {
    console.log('ok');
  } catch (error) {
    console.log(invoiceForSunat.id);
  }
}
