import { BrowserRouter, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./pages/Layout";
import { LoginPage } from "./pages/Login/LoginPage";
import { BillingDocumentDetail } from "./pages/BillingDocuments/BillingDocumentDetail";
import { BillingDocumentForm } from "./pages/BillingDocuments/BillingDocumentForm";
import { BillingDocumentList } from "./pages/BillingDocuments/BillingDocumentList";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import FinancePage from "./pages/Finance/FinancePage";
import { UserList } from "./pages/Admin/UserList";
import { UserForm } from "./pages/Admin/UserForm";
import { VehicleList } from "./pages/Vehicles/VehicleList";
import { VehicleForm } from "./pages/Vehicles/VehicleForm";
import VehicleStatsPage from "./pages/Vehicles/VehicleStatsPage";
import { CustomerList } from "./pages/Customers/CustomerList";
import { CustomerForm } from "./pages/Customers/CustomerForm";
import { DriverList } from "./pages/Drivers/DriverList";
import { DriverForm } from "./pages/Drivers/DriverForm";
import { OwnerList } from "./pages/Owners/OwnerList";
import { OwnerForm } from "./pages/Owners/OwnerForm";
import { CatalogLayout } from "./pages/Catalog/CatalogLayout";
import { CatalogPage } from "./pages/Catalog/CatalogPage";
import EventoPage from "./pages/Public/EventoPage";
import QuoteList from "./pages/Quotes/QuoteList";
import QuoteForm from "./pages/Quotes/QuoteForm";
import QuoteDetail from "./pages/Quotes/QuoteDetail";
import ContactList from "./pages/Contacts/ContactList";
import ContactForm from "./pages/Contacts/ContactForm";
import ReservationList from "./pages/Reservations/ReservationList";
import ReservationForm from "./pages/Reservations/ReservationForm";
import ReservationDetail from "./pages/Reservations/ReservationDetail";
import CalendarPage from "./pages/Calendar/CalendarPage";
import LocationCatalogPage from "./pages/LocationCatalog/LocationCatalogPage";
import { timelinesApi } from "./api/timelines";

function TimelineRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    timelinesApi.get(Number(id)).then(r => {
      const rid = r.data.reservation_id;
      navigate(rid ? `/reservas/${rid}?tab=evento` : '/reservas', { replace: true });
    }).catch(() => navigate('/reservas', { replace: true }));
  }, [id, navigate]);
  return (
    <div className="flex justify-center items-center h-64 text-pink-400">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
}

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
            <Route index element={<DashboardPage />} />

            {/* Billing Documents */}
            <Route path="documentos" element={<BillingDocumentList />} />
            <Route path="documentos/nuevo" element={<BillingDocumentForm />} />
            <Route path="documentos/editar/:id" element={<BillingDocumentForm />} />
            <Route path="documentos/:id" element={<BillingDocumentDetail />} />

            {/* Vehicles */}
            <Route path="vehiculos" element={<VehicleList />} />
            <Route path="vehiculos/nuevo" element={<VehicleForm />} />
            <Route path="vehiculos/editar/:id" element={<VehicleForm />} />
            <Route path="vehiculos/:id/estadisticas" element={<VehicleStatsPage />} />

            {/* Calendar */}
            <Route path="calendario" element={<CalendarPage />} />

            {/* Location Catalog */}
            <Route path="ubicaciones" element={<LocationCatalogPage />} />

            {/* Reservations */}
            <Route path="reservas" element={<ReservationList />} />
            <Route path="reservas/nueva" element={<ReservationForm />} />
            <Route path="reservas/:id" element={<ReservationDetail />} />
            <Route path="reservas/:id/editar" element={<ReservationForm />} />

            {/* Quotes */}
            <Route path="cotizaciones" element={<QuoteList />} />
            <Route path="cotizaciones/nuevo" element={<QuoteForm />} />
            <Route path="cotizaciones/:id" element={<QuoteDetail />} />
            <Route path="cotizaciones/:id/editar" element={<QuoteForm />} />

            {/* Legacy timeline URLs — redirect to reservation?tab=evento */}
            <Route path="eventos/:id" element={<TimelineRedirect />} />

            {/* Contacts (wedding planners, venues, agencies) */}
            <Route path="contactos" element={<ContactList />} />
            <Route path="contactos/nuevo" element={<ContactForm />} />
            <Route path="contactos/editar/:id" element={<ContactForm />} />

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

            {/* Finance Dashboard — admin only */}
            <Route
              path="finanzas"
              element={
                <ProtectedRoute adminOnly>
                  <FinancePage />
                </ProtectedRoute>
              }
            />

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
