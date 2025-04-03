import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { RainbowKitProvider } from "@/components/providers/RainbowKitProvider";
import { Layout } from "@/components/Layout";
import Index from "@/pages/Index";
import Payment from "@/pages/Payment";
import YodlPaymentPage from "@/pages/YodlPaymentPage";
import ConfirmationPage from "@/pages/ConfirmationPage";
import ProductPage from "@/pages/ProductPage";
import AdminScannerPage from "@/pages/AdminScannerPage";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <RainbowKitProvider>
            <AuthProvider>
              <Toaster />
              <Router>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/yodl" element={<YodlPaymentPage />} />
                    <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />
                    <Route path="/product" element={<ProductPage />} />
                    <Route 
                      path="/admin/scanner" 
                      element={
                        <ProtectedRoute>
                          <AdminScannerPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </Router>
            </AuthProvider>
          </RainbowKitProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
