
import { Layout } from "@/components/Layout"
import { ProductGrid } from "@/components/ProductGrid"

const Index = () => {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Featured Products</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Discover our curated selection of premium products for every need.
          </p>
        </div>
        <ProductGrid />
      </div>
    </Layout>
  );
};

export default Index;
