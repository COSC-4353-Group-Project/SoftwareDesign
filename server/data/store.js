// This will be our memory for assignment 3.
// it all resets when the server restarts. Assignment 4 will turn this into a DB. 

// Starting services, just stolen from the frontend services.
function seedServices() {
  return [
    { id: 1, 
      name: 'Dine-in · Party of 1–2', 
      description: 'Standard table seating for dates.', 
      duration: 45, 
      priority: 'high', 
      isOpen: true },
    { id: 2, 
      name: 'Dine-in · Party of 3–6', 
      description: 'Larger tables and booths. Longer Wait-Time.', 
      duration: 60, 
      priority: 'medium', 
      isOpen: true },
    { id: 3, 
      name: 'Bar Seating', 
      description: 'First-come bar stools. Bartender Service', 
      duration: 20, 
      priority: 'medium', 
      isOpen: true },
    { id: 4, 
      name: 'Patio', 
      description: 'Outdoor tables. Closed when it rains.', 
      duration: 40, 
      priority: 'low', 
      isOpen: false },
  ]
}

//Vince: I think this is right? I'm just basically copying the layout Justin has right above but for the history
function seedHistory() {
  const services = seedServices()
  return [
    { id: 1,
      service: services[0].name,
      date: '9-17-2026',
      bribe: 0.00,
      status: 'Entered'
    },
    { id: 2,
      service: services[3].name,
      date: '9-19-2026',
      bribe: 150.00,
      status: 'Entered'
    },
    { id: 3,
      service: services[2].name,
      date: '9-27-2026',
      bribe: 0.00,
      status: 'Canceled'
    }
  ]
}

// Every module reads and writes these arrays. this is where you add a new array if your modeule needs one.
export const store = {
  users: [],
  services: seedServices(),
  queueEntries: [],
  notifications: [],
  history: seedHistory()
}

// Puts the store back to its starting data. Tests call this before each test (unit tests)
// basically resetting changes on each server restart. 
export function resetStore() {
  store.users = []
  store.services = seedServices()
  store.queueEntries = []
  store.notifications = []
  store.history = seedHistory()
}
