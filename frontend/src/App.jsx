import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Mainpage from './pages/MainPage';
import NavBar from './pages/Navbar';
import Footer from './pages/Footer';
import BlogPage from './pages/BlogPage';
import UserSignupForm from './pages/UserSignupForm';
import Login from './pages/UserLoginForm';
import UserDashboard from './pages/UserDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Support from './pages/Support';
function App() {
  return (
    <Router>
      <div className='App'>
        <NavBar/>
        <Routes>
          <Route path="/" element={<Mainpage />} />
          <Route path="/blog/:slug" element={<BlogPage />} />
          <Route path="/user-signup" element={<UserSignupForm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/support" element={<Support />} />
        </Routes>
        <Footer/>
      </div>
    </Router>
  )
}
export default App;