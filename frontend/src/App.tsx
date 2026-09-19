import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/Login/LoginPage";
import { PublicLayout } from "./pages/Public/PublicLayout";
import { CatalogPage } from "./pages/Catalog/CatalogPage";
import ContactoPage from "./pages/Public/ContactoPage";
import PoliticaDatosPage from "./pages/Public/PoliticaDatosPage";
import PoliticaReservasPage from "./pages/Public/PoliticaReservasPage";
import CondicionesServicioPage from "./pages/Public/CondicionesServicioPage";
import ComoFuncionaPage from "./pages/Public/ComoFuncionaPage";
import CityPage from "./pages/Public/CityPage";
import VehicleDetailPage from "./pages/Public/VehicleDetailPage";
import NotFoundPage from "./pages/Public/NotFoundPage";
import BlogListPage from "./pages/Blog/BlogListPage";
import BlogPostPage from "./pages/Blog/BlogPostPage";
import { timelinesApi } from "./api/timelines";
import { LanguageProvider } from "./i18n/LanguageContext";

// Public, but lazy anyway: EventoPage (share-link event view for a driver/
// customer/ops, /evento/:token) is the only public page that renders
// EventRouteMap, which pulls in leaflet — eagerly importing it here put
// leaflet in every catalog/blog visitor's main chunk even though almost
// none of them ever open a share link.
const EventoPage = lazy(() => import("./pages/Public/EventoPage"));

// Everything below this line is admin/staff-only — never rendered for a
// public visitor. Lazy-loaded so the public bundle (catalog, blog, vehicle
// pages — what Google/real prospects actually load) doesn't pull in
// recharts/leaflet/react-big-calendar/@uiw/react-md-editor, ~23MB of
// combined source that only the authenticated admin panel needs. Each
// import becomes its own chunk, fetched on first navigation to that route;
// see the <Suspense> fallback in Layout.tsx wrapping the shared <Outlet />.
const Layout = lazy(() => import("./pages/Layout").then(m => ({ default: m.Layout })));
const BillingDocumentDetail = lazy(() => import("./pages/BillingDocuments/BillingDocumentDetail").then(m => ({ default: m.BillingDocumentDetail })));
const BillingDocumentForm = lazy(() => import("./pages/BillingDocuments/BillingDocumentForm").then(m => ({ default: m.BillingDocumentForm })));
const BillingDocumentList = lazy(() => import("./pages/BillingDocuments/BillingDocumentList").then(m => ({ default: m.BillingDocumentList })));
const DashboardPage = lazy(() => import("./pages/Dashboard/DashboardPage"));
const FinancePage = lazy(() => import("./pages/Finance/FinancePage"));
const UserList = lazy(() => import("./pages/Admin/UserList").then(m => ({ default: m.UserList })));
const UserForm = lazy(() => import("./pages/Admin/UserForm").then(m => ({ default: m.UserForm })));
const VehicleList = lazy(() => import("./pages/Vehicles/VehicleList").then(m => ({ default: m.VehicleList })));
const VehicleForm = lazy(() => import("./pages/Vehicles/VehicleForm").then(m => ({ default: m.VehicleForm })));
const VehicleDetail = lazy(() => import("./pages/Vehicles/VehicleDetail"));
const VehicleStatsPage = lazy(() => import("./pages/Vehicles/VehicleStatsPage"));
const CustomerList = lazy(() => import("./pages/Customers/CustomerList").then(m => ({ default: m.CustomerList })));
const CustomerForm = lazy(() => import("./pages/Customers/CustomerForm").then(m => ({ default: m.CustomerForm })));
const DriverList = lazy(() => import("./pages/Drivers/DriverList").then(m => ({ default: m.DriverList })));
const DriverForm = lazy(() => import("./pages/Drivers/DriverForm").then(m => ({ default: m.DriverForm })));
const OwnerList = lazy(() => import("./pages/Owners/OwnerList").then(m => ({ default: m.OwnerList })));
const OwnerForm = lazy(() => import("./pages/Owners/OwnerForm").then(m => ({ default: m.OwnerForm })));
const QuoteList = lazy(() => import("./pages/Quotes/QuoteList"));
const QuoteForm = lazy(() => import("./pages/Quotes/QuoteForm"));
const QuoteDetail = lazy(() => import("./pages/Quotes/QuoteDetail"));
const FollowUpsPage = lazy(() => import("./pages/FollowUps/FollowUpsPage"));
const ContactList = lazy(() => import("./pages/Contacts/ContactList"));
const ContactForm = lazy(() => import("./pages/Contacts/ContactForm"));
const ContactStatsPage = lazy(() => import("./pages/Contacts/ContactStatsPage"));
const ReservationList = lazy(() => import("./pages/Reservations/ReservationList"));
const ReservationForm = lazy(() => import("./pages/Reservations/ReservationForm"));
const ReservationDetail = lazy(() => import("./pages/Reservations/ReservationDetail"));
const CalendarPage = lazy(() => import("./pages/Calendar/CalendarPage"));
const LocationCatalogPage = lazy(() => import("./pages/LocationCatalog/LocationCatalogPage"));
const BlogAdminPage = lazy(() => import("./pages/Blog/BlogAdminPage"));
const AddonPackagesPage = lazy(() => import("./pages/Admin/AddonPackagesPage"));
const ReviewsPage = lazy(() => import("./pages/Admin/ReviewsPage"));
const FloristPage = lazy(() => import("./pages/Admin/FloristPage"));

// The public site's routes, listed once and mounted twice below (bare
// Spanish paths + under /en) so a new public page only needs adding here,
// never duplicated by hand for the English tree.
const PUBLIC_SITE_ROUTES: { path: string; element: JSX.Element }[] = [
  // The bare root — Google's OAuth homepage verification flagged the old
  // "/" -> redirect-to-/catalogo behavior as a non-static, redirecting
  // homepage. Mounting the same CatalogPage here directly (not a new
  // page) fixes that: real content, no redirect. Its own
  // <HreflangTags path="/catalogo" /> is left pointing at /catalogo on
  // purpose, so /catalogo stays the declared canonical URL and this
  // isn't flagged as duplicate content.
  { path: "", element: <CatalogPage /> },
  { path: "catalogo", element: <CatalogPage /> },
  // Per-vehicle SEO landing page (id-prefixed slug, no DB migration
  // needed — see utils/slug.ts). Mirrored to /en/carros/:idSlug
  // automatically same as every other entry in this array.
  { path: "carros/:idSlug", element: <VehicleDetailPage /> },
  { path: "como-funciona", element: <ComoFuncionaPage /> },
  // City landing pages (mejoras.md ítem 4) — content per city lives in
  // pages/Public/cityData.ts, not the JSX here, so there's a single
  // template (CityPage.tsx) to keep in sync. Three static entries, not one
  // dynamic "bodas-:city" route — react-router v6 doesn't match a literal
  // prefix fused onto a dynamic segment within the same path segment (only
  // ":param" alone, or ":param" as its own "/"-delimited segment), so that
  // shape silently never matched and always fell through to "*" below
  // (confirmed with Playwright before switching to this).
  { path: "bodas-medellin", element: <CityPage citySlug="medellin" /> },
  { path: "bodas-rionegro-llanogrande", element: <CityPage citySlug="rionegro-llanogrande" /> },
  { path: "bodas-carmen-de-viboral", element: <CityPage citySlug="carmen-de-viboral" /> },
  { path: "blog", element: <BlogListPage /> },
  { path: "blog/:slug", element: <BlogPostPage /> },
  { path: "contacto", element: <ContactoPage /> },
  { path: "politica-de-datos", element: <PoliticaDatosPage /> },
  { path: "politica-de-reservas", element: <PoliticaReservasPage /> },
  { path: "condiciones-de-servicio", element: <CondicionesServicioPage /> },
  { path: "*", element: <NotFoundPage /> },
];

// The Dashboard is finance-heavy and fully admin-only on the backend — a
// non-admin landing on "/" would just see every widget fail with a 403.
// Send them somewhere that actually works for their role instead.
function HomeRedirect() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/calendario" replace />;
  return <DashboardPage />;
}

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
    <div className="flex justify-center items-center h-64 text-brand-400">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public site — no auth, shared header/footer. Spanish on the
              unchanged bare paths, English mirrored under /en — see
              PUBLIC_SITE_ROUTES above. */}
          <Route element={<LanguageProvider><PublicLayout /></LanguageProvider>}>
            {PUBLIC_SITE_ROUTES.map(r => (
              r.path === ""
                ? <Route key="es-index" index element={r.element} />
                : <Route key={`es-${r.path}`} path={r.path} element={r.element} />
            ))}
            {/* Public event view — no auth. The page itself is
                Spanish-only by design (no useLang()/t()), but it still
                needs to resolve under /en too: LanguageProvider
                auto-redirects a browser-language-English visitor from
                any bare path to its /en-prefixed twin, and that redirect
                doesn't know this route is an exception. */}
            <Route
              path="evento/:token"
              element={
                <Suspense
                  fallback={
                    <div className="flex justify-center items-center h-64 text-brand-400">
                      <Loader2 className="animate-spin" size={28} />
                    </div>
                  }
                >
                  <EventoPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="en" element={<LanguageProvider><PublicLayout /></LanguageProvider>}>
            {PUBLIC_SITE_ROUTES.map(r => (
              r.path === ""
                ? <Route key="en-index" index element={r.element} />
                : <Route key={`en-${r.path}`} path={r.path} element={r.element} />
            ))}
            <Route
              path="evento/:token"
              element={
                <Suspense
                  fallback={
                    <div className="flex justify-center items-center h-64 text-brand-400">
                      <Loader2 className="animate-spin" size={28} />
                    </div>
                  }
                >
                  <EventoPage />
                </Suspense>
              }
            />
          </Route>

          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <div className="flex justify-center items-center h-screen text-brand-400">
                      <Loader2 className="animate-spin" size={28} />
                    </div>
                  }
                >
                  <Layout />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<HomeRedirect />} />

            {/* Billing Documents — admin only */}
            <Route path="documentos" element={<ProtectedRoute adminOnly><BillingDocumentList /></ProtectedRoute>} />
            <Route path="documentos/nuevo" element={<ProtectedRoute adminOnly><BillingDocumentForm /></ProtectedRoute>} />
            <Route path="documentos/editar/:id" element={<ProtectedRoute adminOnly><BillingDocumentForm /></ProtectedRoute>} />
            <Route path="documentos/:id" element={<ProtectedRoute adminOnly><BillingDocumentDetail /></ProtectedRoute>} />

            {/* Vehicles */}
            <Route path="vehiculos" element={<VehicleList />} />
            <Route path="vehiculos/nuevo" element={<VehicleForm />} />
            <Route path="vehiculos/editar/:id" element={<VehicleForm />} />
            <Route path="vehiculos/:id/estadisticas" element={<ProtectedRoute adminOnly><VehicleStatsPage /></ProtectedRoute>} />
            <Route path="vehiculos/:id" element={<VehicleDetail />} />

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
            <Route path="seguimientos" element={<FollowUpsPage />} />

            {/* Legacy timeline URLs — redirect to reservation?tab=evento */}
            <Route path="eventos/:id" element={<TimelineRedirect />} />

            {/* Contacts (wedding planners, venues, agencies) */}
            <Route path="contactos" element={<ContactList />} />
            <Route path="contactos/nuevo" element={<ContactForm />} />
            <Route path="contactos/editar/:id" element={<ContactForm />} />
            <Route path="contactos/:id/estadisticas" element={<ContactStatsPage />} />

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

            {/* Blog admin — admin only */}
            <Route
              path="blog-admin"
              element={
                <ProtectedRoute adminOnly>
                  <BlogAdminPage />
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
            <Route
              path="admin/add-ons"
              element={
                <ProtectedRoute adminOnly>
                  <AddonPackagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/opiniones"
              element={
                <ProtectedRoute adminOnly>
                  <ReviewsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/floristeria"
              element={
                <ProtectedRoute adminOnly>
                  <FloristPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
