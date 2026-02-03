# Backend API Requirements - Engagement Statistics

## მიზანი
Frontend-ს სჭირდება endpoint-ები რომ დავთვალოთ და ვნახოთ:
- ლაიქები (likes) მაღაზიებზე და მექანიკოსებზე
- ნახვები (views) მაღაზიებზე და მექანიკოსებზე  
- დარეკვის ღილაკის დაჭერები (call button clicks) მაღაზიებზე და მექანიკოსებზე

## 1. სტატისტიკის Endpoint-ები (რაოდენობები)

### მაღაზიებისთვის:

#### Option 1: Combined Stats Endpoint (რეკომენდებული)
```
GET /stores/{storeId}/stats
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "likesCount": 15,
    "viewsCount": 234,
    "callsCount": 8
  }
}
```

ან პირდაპირ:
```json
{
  "likesCount": 15,
  "viewsCount": 234,
  "callsCount": 8
}
```

#### Option 2: Engagement Endpoint
```
GET /stores/{storeId}/engagement
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "likes": 15,
    "views": 234,
    "calls": 8
  }
}
```

### მექანიკოსებისთვის:

#### Option 1: Combined Stats Endpoint (რეკომენდებული)
```
GET /mechanics/{mechanicId}/stats
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "likesCount": 12,
    "viewsCount": 189,
    "callsCount": 5
  }
}
```

#### Option 2: Engagement Endpoint
```
GET /mechanics/{mechanicId}/engagement
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "likes": 12,
    "views": 189,
    "calls": 5
  }
}
```

---

## 2. დეტალური Engagement Endpoint-ები (ვინ და როდის)

### მაღაზიებისთვის:

#### Option 1: Combined Engagement (რეკომენდებული)
```
GET /stores/{storeId}/engagement
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "likes": [
      {
        "userId": "usr_1234567890",
        "userName": "გიორგი პაპაშვილი",
        "userPhone": "+995511123456",
        "userEmail": "giorgi@example.com",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "userId": "usr_0987654321",
        "userName": "ნინო ლომიძე",
        "userPhone": "+995555123456",
        "timestamp": "2024-01-14T15:20:00.000Z"
      }
    ],
    "views": [
      {
        "userId": "usr_1234567890",
        "userName": "გიორგი პაპაშვილი",
        "userPhone": "+995511123456",
        "timestamp": "2024-01-15T10:25:00.000Z"
      }
    ],
    "calls": [
      {
        "userId": "usr_1234567890",
        "userName": "გიორგი პაპაშვილი",
        "userPhone": "+995511123456",
        "timestamp": "2024-01-15T10:35:00.000Z"
      }
    ]
  }
}
```

#### Option 2: ცალ-ცალკე Endpoint-ები

**ლაიქები:**
```
GET /stores/{storeId}/likes
```

**Response Format:**
```json
[
  {
    "userId": "usr_1234567890",
    "userName": "გიორგი პაპაშვილი",
    "userPhone": "+995511123456",
    "userEmail": "giorgi@example.com",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
]
```

ან:
```json
{
  "success": true,
  "data": [
    {
      "userId": "usr_1234567890",
      "userName": "გიორგი პაპაშვილი",
      "userPhone": "+995511123456",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**ნახვები:**
```
GET /stores/{storeId}/views
```

**Response Format:** იგივე როგორც likes-ისთვის

**დარეკვები:**
```
GET /stores/{storeId}/calls
```

**Response Format:** იგივე როგორც likes-ისთვის

### მექანიკოსებისთვის:

იგივე სტრუქტურა, მხოლოდ `/mechanics/{mechanicId}/` prefix-ით:

```
GET /mechanics/{mechanicId}/engagement
GET /mechanics/{mechanicId}/likes
GET /mechanics/{mechanicId}/views
GET /mechanics/{mechanicId}/calls
```

---

## 3. Data Model (MongoDB Schema მაგალითი)

### Store Engagement Collection:
```javascript
{
  storeId: String, // ObjectId reference to Store
  userId: String,  // ObjectId reference to User
  userName: String,
  userPhone: String,
  userEmail: String,
  action: String,  // 'like', 'view', 'call'
  timestamp: Date,
  createdAt: Date
}
```

### Mechanic Engagement Collection:
```javascript
{
  mechanicId: String, // ObjectId reference to Mechanic
  userId: String,     // ObjectId reference to User
  userName: String,
  userPhone: String,
  userEmail: String,
  action: String,     // 'like', 'view', 'call'
  timestamp: Date,
  createdAt: Date
}
```

---

## 4. Tracking Events (როდესაც მომხმარებელი აკეთებს action-ს)

### Frontend-დან გაიგზავნება:

**ლაიქისთვის:**
```
POST /stores/{storeId}/like
POST /mechanics/{mechanicId}/like
```

**Body:**
```json
{
  "userId": "usr_1234567890"
}
```

**ნახვისთვის:**
```
POST /stores/{storeId}/view
POST /mechanics/{mechanicId}/view
```

**Body:**
```json
{
  "userId": "usr_1234567890"
}
```

**დარეკვისთვის:**
```
POST /stores/{storeId}/call
POST /mechanics/{mechanicId}/call
```

**Body:**
```json
{
  "userId": "usr_1234567890"
}
```

---

## 5. რეკომენდაციები

1. **დუბლირების თავიდან ასაცილებლად:** თუ იგივე user-ი იგივე store/mechanic-ს რამდენჯერმე ნახავს, შეინახეთ მხოლოდ პირველი view ან ბოლო view (ან ორივე თუ გჭირდებათ).

2. **Performance:** `/stats` endpoint-ზე გამოიყენეთ aggregation pipeline რომ სწრაფად დათვალოთ რაოდენობები.

3. **Indexing:** დაამატეთ index-ები:
   - `storeId` + `action` + `timestamp`
   - `mechanicId` + `action` + `timestamp`
   - `userId` + `timestamp`

4. **Pagination:** თუ engagement სია დიდია, დაამატეთ pagination:
   ```
   GET /stores/{storeId}/likes?limit=50&offset=0
   ```

---

## 6. მინიმალური Implementation

თუ სრული implementation დიდი დრო სჭირდება, მინიმალურად გააკეთეთ:

1. **Stats endpoint-ები:**
   - `GET /stores/{storeId}/stats` - დააბრუნოს `{ likesCount: 0, viewsCount: 0, callsCount: 0 }`
   - `GET /mechanics/{mechanicId}/stats` - იგივე

2. **Engagement endpoint-ები:**
   - `GET /stores/{storeId}/engagement` - დააბრუნოს `{ likes: [], views: [], calls: [] }`
   - `GET /mechanics/{mechanicId}/engagement` - იგივე

ეს საკმარისია frontend-ისთვის რომ მუშაობდეს. შემდეგ შეგიძლიათ თანდათან დაამატოთ tracking logic.

---

## 7. Error Handling

თუ store/mechanic არ არსებობს, დააბრუნეთ:
```json
{
  "success": false,
  "error": "Store not found",
  "code": 404
}
```

თუ მონაცემები არ არის, დააბრუნეთ:
```json
{
  "success": true,
  "data": {
    "likesCount": 0,
    "viewsCount": 0,
    "callsCount": 0
  }
}
```

---

## 8. Testing

Frontend ავტომატურად ცდის სხვადასხვა endpoint-ებს, ასე რომ თუ რომელიმე არ მუშაობს, სხვა გამოიყენება. მაგრამ რეკომენდებულია:
- `/stores/{id}/stats` - სტატისტიკისთვის
- `/stores/{id}/engagement` - დეტალებისთვის

---

## შეჯამება

**საჭირო Endpoint-ები:**

### მაღაზიებისთვის:
- ✅ `GET /stores/{storeId}/stats` - რაოდენობები
- ✅ `GET /stores/{storeId}/engagement` - დეტალები
- ✅ `POST /stores/{storeId}/like` - tracking
- ✅ `POST /stores/{storeId}/view` - tracking  
- ✅ `POST /stores/{storeId}/call` - tracking

### მექანიკოსებისთვის:
- ✅ `GET /mechanics/{mechanicId}/stats` - რაოდენობები
- ✅ `GET /mechanics/{mechanicId}/engagement` - დეტალები
- ✅ `POST /mechanics/{mechanicId}/like` - tracking
- ✅ `POST /mechanics/{mechanicId}/view` - tracking
- ✅ `POST /mechanics/{mechanicId}/call` - tracking

**Priority:**
1. **High:** Stats endpoint-ები (რაოდენობებისთვის)
2. **Medium:** Engagement endpoint-ები (დეტალებისთვის)
3. **Low:** Tracking POST endpoint-ები (თუ აპლიკაციაში უკვე არის tracking)

---

# Backend API Requirements - VIP სტატუსი მაღაზიებზე

## მიზანი
Frontend-ს სჭირდება VIP სტატუსის მართვის ფუნქციონალი მაღაზიებზე. VIP სტატუსი ხელმისაწვდომია **მხოლოდ დაშლილების** (type === 'დაშლილები') ტიპის მაღაზიებისთვის.

## 1. Store Model-ში ველის დამატება

### MongoDB Schema:
```javascript
{
  // ... existing fields ...
  isVip: {
    type: Boolean,
    default: false
  }
}
```

**მნიშვნელობა:**
- `isVip: true` - მაღაზიას აქვს VIP სტატუსი
- `isVip: false` - მაღაზიას არ აქვს VIP სტატუსი (default)
- VIP სტატუსი გამოიყენება მხოლოდ `type === 'დაშლილები'` მაღაზიებისთვის

---

## 2. API Endpoint-ების განახლება

### 2.1. GET /stores - მაღაზიების სია

**მოთხოვნა:** დააბრუნოს `isVip` ველი თითოეულ მაღაზიაში

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "store_123",
      "name": "მაღაზიის სახელი",
      "type": "დაშლილები",
      "isVip": true,
      // ... other fields ...
    },
    {
      "id": "store_456",
      "name": "სხვა მაღაზია",
      "type": "მაღაზია",
      "isVip": false,
      // ... other fields ...
    }
  ]
}
```

### 2.2. GET /stores/{storeId} - ერთი მაღაზიის დეტალები

**მოთხოვნა:** დააბრუნოს `isVip` ველი

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "store_123",
    "name": "მაღაზიის სახელი",
    "type": "დაშლილები",
    "isVip": true,
    // ... other fields ...
  }
}
```

### 2.3. PATCH /stores/{storeId} - VIP სტატუსის განახლება

**მოთხოვნა:** მიიღოს და განაახლოს `isVip` ველი

**Request Body:**
```json
{
  "isVip": true
}
```

ან:
```json
{
  "isVip": false
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "store_123",
    "name": "მაღაზიის სახელი",
    "type": "დაშლილები",
    "isVip": true,
    // ... other fields ...
  }
}
```

**Validation:**
- VIP სტატუსი შეიძლება დაყენდეს/მოიხსნას მხოლოდ `type === 'დაშლილები'` მაღაზიებისთვის
- თუ მაღაზიის `type` არ არის 'დაშლილები', დააბრუნეთ error:
  ```json
  {
    "success": false,
    "error": "VIP სტატუსი ხელმისაწვდომია მხოლოდ დაშლილების ტიპის მაღაზიებისთვის",
    "code": 400
  }
  ```

---

## 3. Frontend-ის მოთხოვნები

Frontend აკეთებს შემდეგ request-ს VIP სტატუსის შესაცვლელად:

```javascript
PATCH /stores/{storeId}
Content-Type: application/json

{
  "isVip": true  // ან false
}
```

**მდებარეობა:** 
- VIP toggle button გამოჩნდება მხოლოდ `type === 'დაშლილები'` მაღაზიებისთვის
- VIP badge გამოჩნდება მხოლოდ `type === 'დაშლილები' && isVip === true` მაღაზიებისთვის

---

## 4. Error Handling

### Store არ არსებობს:
```json
{
  "success": false,
  "error": "Store not found",
  "code": 404
}
```

### VIP სტატუსი არასწორი ტიპის მაღაზიაზე:
```json
{
  "success": false,
  "error": "VIP სტატუსი ხელმისაწვდომია მხოლოდ დაშლილების ტიპის მაღაზიებისთვის",
  "code": 400
}
```

### Validation Error:
```json
{
  "success": false,
  "error": "Invalid request body",
  "code": 400
}
```

---

## 5. შეჯამება

**საჭირო ცვლილებები:**

1. ✅ **Store Model-ში:**
   - დაამატეთ `isVip: Boolean` ველი (default: false)

2. ✅ **GET /stores endpoint:**
   - დააბრუნეთ `isVip` ველი თითოეულ მაღაზიაში

3. ✅ **GET /stores/{storeId} endpoint:**
   - დააბრუნეთ `isVip` ველი

4. ✅ **PATCH /stores/{storeId} endpoint:**
   - მიიღეთ `isVip` ველი request body-ში
   - განაახლეთ `isVip` ველი
   - დაამატეთ validation: VIP მხოლოდ 'დაშლილები' ტიპისთვის
   - დააბრუნეთ განახლებული მაღაზია `isVip` ველით

**Priority:**
- **High:** VIP სტატუსის მართვა აუცილებელია admin panel-ისთვის