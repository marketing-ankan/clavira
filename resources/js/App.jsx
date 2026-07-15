import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { CartProvider } from './store';
import { AccountProvider } from './account';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/ProductPage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionPage from './pages/CollectionPage';
import CraftsmanshipPage from './pages/CraftsmanshipPage';
import NriPage from './pages/NriPage';
import VerifyPage from './pages/VerifyPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import SearchPage from './pages/SearchPage';
import ContactPage from './pages/ContactPage';
import PolicyPage from './pages/PolicyPage';
import AccountAuth from './pages/AccountAuth';
import AccountLayout from './pages/AccountLayout';
import AccountOverview from './pages/AccountOverview';
import { AccountOrders, AccountOrderDetail } from './pages/AccountOrders';
import AccountWishlist from './pages/AccountWishlist';
import AccountAddresses from './pages/AccountAddresses';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/AdminLogin';
import Dashboard from './admin/Dashboard';
import Products from './admin/Products';
import ProductEdit from './admin/ProductEdit';
import Orders from './admin/Orders';
import OrderDetail from './admin/OrderDetail';
import Enquiries from './admin/Enquiries';
import Settings from './admin/Settings';

function ShopLayout() {
    return (
        <AccountProvider>
            <CartProvider>
                <Header />
                <CartDrawer />
                <Outlet />
                <Footer />
            </CartProvider>
        </AccountProvider>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Storefront */}
                <Route element={<ShopLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/category/:slug" element={<CategoryPage />} />
                    <Route path="/product/:slug" element={<ProductPage />} />
                    <Route path="/collections" element={<CollectionsPage />} />
                    <Route path="/collections/:slug" element={<CollectionPage />} />
                    <Route path="/craftsmanship" element={<CraftsmanshipPage />} />
                    <Route path="/nri" element={<NriPage />} />
                    <Route path="/verify" element={<VerifyPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order-success" element={<OrderSuccessPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/policies/:slug" element={<PolicyPage />} />
                    <Route path="/account/login" element={<AccountAuth />} />
                    <Route path="/account" element={<AccountLayout />}>
                        <Route index element={<AccountOverview />} />
                        <Route path="orders" element={<AccountOrders />} />
                        <Route path="orders/:orderNo" element={<AccountOrderDetail />} />
                        <Route path="wishlist" element={<AccountWishlist />} />
                        <Route path="addresses" element={<AccountAddresses />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                </Route>

                {/* Admin */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="products" element={<Products />} />
                    <Route path="products/:id" element={<ProductEdit />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:id" element={<OrderDetail />} />
                    <Route path="enquiries" element={<Enquiries />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

function NotFound() {
    return (
        <main className="max-w-xl mx-auto px-4 py-32 text-center">
            <p className="font-display text-6xl text-gold/40">404</p>
            <h1 className="font-display text-3xl mt-4">This page has wandered off</h1>
            <a href="/" className="btn-gold mt-8">Return Home</a>
        </main>
    );
}
