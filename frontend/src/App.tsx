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
import TimelineList from "./pages/Timelines/TimelineList";
import TimelineForm from "./pages/Timelines/TimelineForm";
import TimelineDetail from "./pages/Timelines/TimelineDetail";
import EventoPage from "./pages/Public/EventoPage";
import QuoteList from "./pages/Quotes/QuoteList";
import QuoteForm from "./pages/Quotes/QuoteForm";
import ReservationList from "./pages/Reservations/ReservationList";
import ReservationForm from "./pages/Reservations/ReservationForm";
import ReservationDetail from "./pages/Reservations/ReservationDetail";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public catalog — no auth */}
          <Route element={<CatalogLayout />}>
            <Route path="catalogo" element={<CatalogPage />} />
          </Route>

          {/* Public event view — no auth */}
          <Route path="/evento/:token" element={<EventoPage />} />

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

            {/* Reservations */}
            <Route path="reservas" element={<ReservationList />} />
            <Route path="reservas/nueva" element={<ReservationForm />} />
            <Route path="reservas/:id" element={<ReservationDetail />} />
            <Route path="reservas/:id/editar" element={<ReservationForm />} />

            {/* Quotes */}
            <Route path="cotizaciones" element={<QuoteList />} />
            <Route path="cotizaciones/nuevo" element={<QuoteForm />} />
            <Route path="cotizaciones/:id/editar" element={<QuoteForm />} />

            {/* Timelines / Events */}
            <Route path="eventos" element={<TimelineList />} />
            <Route path="eventos/nuevo" element={<TimelineForm />} />
            <Route path="eventos/:id" element={<TimelineDetail />} />
            <Route path="eventos/:id/editar" element={<TimelineForm />} />

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
