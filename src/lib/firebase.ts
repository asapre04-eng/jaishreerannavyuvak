import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCkeJUlGX7Rd42uPkDJkLqaxvHLlrvezUg',
  databaseURL: 'https://samiti-app5-default-rtdb.asia-southeast1.firebasedatabase.app',
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
