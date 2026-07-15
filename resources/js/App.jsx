import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CartProvider } from './store';
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

export default function App() {
    return (
        <BrowserRouter>
            <CartProvider>
                <Header />
                <CartDrawer />
                <Routes>
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
                    <Route path="*" element={<NotFound />} />
                </Routes>
                <Footer />
            </CartProvider>
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
