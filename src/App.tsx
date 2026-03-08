import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomeScreen from './screens/HomeScreen'
import MenuSettingsScreen from './screens/MenuSettingsScreen'
import CalendarScreen from './screens/CalendarScreen'
import ChangesScreen from './screens/ChangesScreen'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/menu" element={<MenuSettingsScreen />} />
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="/changes" element={<ChangesScreen />} />
      </Routes>
    </Layout>
  )
}

export default App
