import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import './index.css';

import { HomePage } from './components/pages/HomePage';
import { BlueprintEditor } from './components/pages/BlueprintEditor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/blueprint/:blueprintId" element={<BlueprintEditor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
