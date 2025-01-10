import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ExperimentList from './pages/ExperimentList';
import ExperimentDetails from './pages/ExperimentDetails';
import QuestionHistory from './pages/QuestionHistory';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <main className="py-4">
          <Routes>
            <Route path="/" element={<ExperimentList />} />
            <Route path="/experiment/:experimentId" element={<ExperimentDetails />} />
            <Route path="/question/:questionId" element={<QuestionHistory />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
