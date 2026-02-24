import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PageLayout } from './components/layout/PageLayout';
import { LandingPage } from './pages/landing/LandingPage';
import { SimulationPage } from './pages/simulation/SimulationPage';

function App() {
  return (
    <BrowserRouter>
      <PageLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/simulation" element={<SimulationPage />} />
        </Routes>
      </PageLayout>
    </BrowserRouter>
  );
}

export default App;
