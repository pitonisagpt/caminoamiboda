import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./pages/Layout";
import { LoginPage } from "./pages/Login/LoginPage";
import { BillingDocumentDetail } from "./pages/BillingDocuments/BillingDocumentDetail";
import { BillingDocumentForm } from "./pages/BillingDocuments/BillingDocumentForm";
import { BillingDocumentList } from "./pages/BillingDocuments/BillingDocumentList";
import { UserList } from "./pages/Admin/UserList";
import { UserForm } from "./pages/Admin/UserForm";
import { VehicleList } from "./pages/Vehicles/VehicleList";
import { VehicleForm } from "./pages/Vehicles/VehicleForm";
import { CustomerList } from "./pages/Customers/CustomerList";
import { CustomerForm } from "./pages/Customers/CustomerForm";
import { DriverList } from "./pages/Drivers/DriverList";
import { DriverForm } from "./pages/Drivers/DriverForm";
import { OwnerList } from "./pages/Owners/OwnerList";
import { OwnerForm } from "./pages/Owners/OwnerForm";
import { CatalogLayout } from "./pages/Catalog/CatalogLayout";
import { CatalogPage } from "./pages/Catalog/CatalogPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public catalog — no auth */}
          <Route element={<CatalogLayout />}>
            <Route path="catalogo" element={<CatalogPage />} />
          </Route>

          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<BillingDocumentList />} />
            <Route path="nueva" element={<BillingDocumentForm />} />
            <Route path="editar/:id" element={<BillingDocumentForm />} />
            <Route path="documento/:id" element={<BillingDocumentDetail />} />

            {/* Vehicles */}
            <Route path="vehiculos" element={<VehicleList />} />
            <Route path="vehiculos/nuevo" element={<VehicleForm />} />
            <Route path="vehiculos/editar/:id" element={<VehicleForm />} />

            {/* Customers */}
            <Route path="clientes" element={<CustomerList />} />
            <Route path="clientes/nuevo" element={<CustomerForm />} />
            <Route path="clientes/editar/:id" element={<CustomerForm />} />

            {/* Drivers */}
            <Route path="conductores" element={<DriverList />} />
            <Route path="conductores/nuevo" element={<DriverForm />} />
            <Route path="conductores/editar/:id" element={<DriverForm />} />

            {/* Vehicle Owners — admin only */}
            <Route path="propietarios" element={<ProtectedRoute adminOnly><OwnerList /></ProtectedRoute>} />
            <Route path="propietarios/nuevo" element={<ProtectedRoute adminOnly><OwnerForm /></ProtectedRoute>} />
            <Route path="propietarios/editar/:id" element={<ProtectedRoute adminOnly><OwnerForm /></ProtectedRoute>} />

            {/* Admin */}
            <Route
              path="admin/usuarios"
              element={
                <ProtectedRoute adminOnly>
                  <UserList />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/usuarios/nuevo"
              element={
                <ProtectedRoute adminOnly>
                  <UserForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/usuarios/editar/:id"
              element={
                <ProtectedRoute adminOnly>
                  <UserForm />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
