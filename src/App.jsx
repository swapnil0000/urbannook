import Header from "./component/layout/Header"

function App() {

  return (
    <div className="min-h-screen bg-gray-100">
      <Header/>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-blue-600">to Urban Nook</h1>
        <p className="text-gray-700 mt-2"> is working!</p>
      </div>
    </div>
  )
}

export default App
