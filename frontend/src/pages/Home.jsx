import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import SearchDemo from '../components/SearchDemo.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import Technology from '../components/Technology.jsx'

export default function Home() {
  return (
    <div id="top">
      <Navbar />
      <Hero />
      <SearchDemo />
      <HowItWorks />
      <Technology />
    </div>
  )
}
