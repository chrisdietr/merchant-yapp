
import { useSearchParams } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { PaymentQRCode } from "@/components/PaymentQRCode"

const Payment = () => {
  const [searchParams] = useSearchParams()
  const productId = searchParams.get("productId")

  if (!productId) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold text-destructive">Invalid Product</h2>
          <p className="mt-2 text-muted-foreground">Product information is missing.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <PaymentQRCode productId={productId} />
    </Layout>
  )
}

export default Payment
