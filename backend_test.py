#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Roommate Finder App
Tests all backend endpoints with realistic data
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime
from typing import Dict, Any, List

# Test configuration
BASE_URL = "https://5d34527e95f5.ngrok-free.app/api"  # From .env REACT_APP_BACKEND_URL
TEST_USERS = [
    {
        "telegram_id": 123456789,
        "username": "anna_moscow",
        "first_name": "Анна",
        "last_name": "Петрова",
        "age": 25,
        "gender": "female",
        "about": "Работаю в IT, люблю готовить и читать. Ищу спокойную соседку.",
        "price_range_min": 30000,
        "price_range_max": 50000,
        "metro_station": "Сокольники",
        "search_radius": 5,
        "latitude": 55.7887,  # Moscow coordinates
        "longitude": 37.6796
    },
    {
        "telegram_id": 987654321,
        "username": "dmitry_dev",
        "first_name": "Дмитрий",
        "last_name": "Иванов",
        "age": 28,
        "gender": "male",
        "about": "Программист, работаю удаленно. Чистоплотный, не курю.",
        "price_range_min": 25000,
        "price_range_max": 45000,
        "metro_station": "Красносельская",
        "search_radius": 7,
        "latitude": 55.7799,
        "longitude": 37.6656
    }
]

class BackendTester:
    def __init__(self):
        self.session = None
        self.created_users = []
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    async def test_health_check(self):
        """Test health check endpoint"""
        try:
            async with self.session.get(f"{BASE_URL}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("status") == "healthy":
                        self.log_result("Health Check", True, f"Response: {data}")
                        return True
                    else:
                        self.log_result("Health Check", False, f"Unexpected response: {data}")
                        return False
                else:
                    self.log_result("Health Check", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            return False
    
    async def test_create_user(self, user_data: Dict[str, Any]) -> bool:
        """Test user creation"""
        try:
            async with self.session.post(f"{BASE_URL}/users", json=user_data) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("telegram_id") == user_data["telegram_id"]:
                        self.created_users.append(data)
                        self.log_result(f"Create User {user_data['first_name']}", True, 
                                      f"User ID: {data.get('id')}")
                        return True
                    else:
                        self.log_result(f"Create User {user_data['first_name']}", False, 
                                      f"Data mismatch: {data}")
                        return False
                elif response.status == 400:
                    error_text = await response.text()
                    if "already exists" in error_text:
                        self.log_result(f"Create User {user_data['first_name']}", True, 
                                      "User already exists (expected)")
                        return True
                    else:
                        self.log_result(f"Create User {user_data['first_name']}", False, 
                                      f"HTTP 400: {error_text}")
                        return False
                else:
                    error_text = await response.text()
                    self.log_result(f"Create User {user_data['first_name']}", False, 
                                  f"HTTP {response.status}: {error_text}")
                    return False
        except Exception as e:
            self.log_result(f"Create User {user_data['first_name']}", False, f"Exception: {str(e)}")
            return False
    
    async def test_get_user(self, telegram_id: int) -> bool:
        """Test get user by telegram_id"""
        try:
            async with self.session.get(f"{BASE_URL}/users/me?telegram_id={telegram_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("telegram_id") == telegram_id:
                        self.log_result(f"Get User {telegram_id}", True, 
                                      f"Retrieved user: {data.get('first_name')}")
                        return True
                    else:
                        self.log_result(f"Get User {telegram_id}", False, 
                                      f"Data mismatch: {data}")
                        return False
                elif response.status == 404:
                    self.log_result(f"Get User {telegram_id}", False, "User not found")
                    return False
                else:
                    error_text = await response.text()
                    self.log_result(f"Get User {telegram_id}", False, 
                                  f"HTTP {response.status}: {error_text}")
                    return False
        except Exception as e:
            self.log_result(f"Get User {telegram_id}", False, f"Exception: {str(e)}")
            return False
    
    async def test_update_user(self, telegram_id: int) -> bool:
        """Test user update"""
        update_data = {
            "telegram_id": telegram_id,
            "age": 26,
            "about": "Обновленная информация о себе",
            "search_radius": 10
        }
        
        try:
            async with self.session.put(f"{BASE_URL}/users/me", json=update_data) as response:
                if response.status == 200:
                    data = await response.json()
                    if (data.get("age") == 26 and 
                        data.get("search_radius") == 10 and
                        "Обновленная информация" in data.get("about", "")):
                        self.log_result(f"Update User {telegram_id}", True, 
                                      "User updated successfully")
                        return True
                    else:
                        self.log_result(f"Update User {telegram_id}", False, 
                                      f"Update not reflected: {data}")
                        return False
                elif response.status == 404:
                    self.log_result(f"Update User {telegram_id}", False, "User not found")
                    return False
                else:
                    error_text = await response.text()
                    self.log_result(f"Update User {telegram_id}", False, 
                                  f"HTTP {response.status}: {error_text}")
                    return False
        except Exception as e:
            self.log_result(f"Update User {telegram_id}", False, f"Exception: {str(e)}")
            return False
    
    async def test_get_properties(self, telegram_id: int) -> bool:
        """Test get properties near user"""
        try:
            async with self.session.get(f"{BASE_URL}/properties?telegram_id={telegram_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        self.log_result(f"Get Properties {telegram_id}", True, 
                                      f"Found {len(data)} properties")
                        return True
                    else:
                        self.log_result(f"Get Properties {telegram_id}", False, 
                                      f"Expected list, got: {type(data)}")
                        return False
                else:
                    error_text = await response.text()
                    self.log_result(f"Get Properties {telegram_id}", False, 
                                  f"HTTP {response.status}: {error_text}")
                    return False
        except Exception as e:
            self.log_result(f"Get Properties {telegram_id}", False, f"Exception: {str(e)}")
            return False
    
    async def test_get_matches(self, telegram_id: int) -> bool:
        """Test get potential matches"""
        try:
            async with self.session.get(f"{BASE_URL}/matches?telegram_id={telegram_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        self.log_result(f"Get Matches {telegram_id}", True, 
                                      f"Found {len(data)} potential matches")
                        return True
                    else:
                        self.log_result(f"Get Matches {telegram_id}", False, 
                                      f"Expected list, got: {type(data)}")
                        return False
                else:
                    error_text = await response.text()
                    self.log_result(f"Get Matches {telegram_id}", False, 
                                  f"HTTP {response.status}: {error_text}")
                    return False
        except Exception as e:
            self.log_result(f"Get Matches {telegram_id}", False, f"Exception: {str(e)}")
            return False
    
    async def test_create_like(self, telegram_id: int, target_id: str, target_type: str) -> bool:
        """Test creating a like"""
        try:
            params = {
                "telegram_id": telegram_id,
                "target_id": target_id,
                "target_type": target_type
            }
            
            async with self.session.post(f"{BASE_URL}/likes", params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("like_id"):
                        self.log_result(f"Create Like {telegram_id}->{target_id}", True, 
                                      f"Like created: {data.get('like_id')}")
                        return True
                    else:
                        self.log_result(f"Create Like {telegram_id}->{target_id}", False, 
                                      f"No like_id in response: {data}")
                        return False
                elif response.status == 400:
                    error_text = await response.text()
                    if "already exists" in error_text:
                        self.log_result(f"Create Like {telegram_id}->{target_id}", True, 
                                      "Like already exists (expected)")
                        return True
                    else:
                        self.log_result(f"Create Like {telegram_id}->{target_id}", False, 
                                      f"HTTP 400: {error_text}")
                        return False
                else:
                    error_text = await response.text()
                    self.log_result(f"Create Like {telegram_id}->{target_id}", False, 
                                  f"HTTP {response.status}: {error_text}")
                    return False
        except Exception as e:
            self.log_result(f"Create Like {telegram_id}->{target_id}", False, f"Exception: {str(e)}")
            return False
    
    async def test_get_user_matches(self, telegram_id: int) -> bool:
        """Test get confirmed matches"""
        try:
            async with self.session.get(f"{BASE_URL}/user-matches?telegram_id={telegram_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        self.log_result(f"Get User Matches {telegram_id}", True, 
                                      f"Found {len(data)} confirmed matches")
                        return True
                    else:
                        self.log_result(f"Get User Matches {telegram_id}", False, 
                                      f"Expected list, got: {type(data)}")
                        return False
                else:
                    error_text = await response.text()
                    self.log_result(f"Get User Matches {telegram_id}", False, 
                                  f"HTTP {response.status}: {error_text}")
                    return False
        except Exception as e:
            self.log_result(f"Get User Matches {telegram_id}", False, f"Exception: {str(e)}")
            return False
    
    async def test_get_liked_properties(self, telegram_id: int) -> bool:
        """Test get liked properties"""
        try:
            async with self.session.get(f"{BASE_URL}/liked-properties?telegram_id={telegram_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        self.log_result(f"Get Liked Properties {telegram_id}", True, 
                                      f"Found {len(data)} liked properties")
                        return True
                    else:
                        self.log_result(f"Get Liked Properties {telegram_id}", False, 
                                      f"Expected list, got: {type(data)}")
                        return False
                else:
                    error_text = await response.text()
                    self.log_result(f"Get Liked Properties {telegram_id}", False, 
                                  f"HTTP {response.status}: {error_text}")
                    return False
        except Exception as e:
            self.log_result(f"Get Liked Properties {telegram_id}", False, f"Exception: {str(e)}")
            return False
    
    async def test_invalid_data(self) -> bool:
        """Test API with invalid data"""
        invalid_user = {
            "telegram_id": "invalid",  # Should be int
            "first_name": "",  # Empty required field
            "age": -5,  # Invalid age
            "gender": "unknown",  # Invalid gender
            "latitude": 200,  # Invalid coordinates
            "longitude": 200
        }
        
        try:
            async with self.session.post(f"{BASE_URL}/users", json=invalid_user) as response:
                if response.status == 422 or response.status == 400:
                    self.log_result("Invalid Data Validation", True, 
                                  f"Correctly rejected invalid data with HTTP {response.status}")
                    return True
                else:
                    self.log_result("Invalid Data Validation", False, 
                                  f"Should have rejected invalid data, got HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_result("Invalid Data Validation", False, f"Exception: {str(e)}")
            return False
    
    async def test_nonexistent_user(self) -> bool:
        """Test API with nonexistent user"""
        nonexistent_id = 999999999
        
        try:
            async with self.session.get(f"{BASE_URL}/users/me?telegram_id={nonexistent_id}") as response:
                if response.status == 404:
                    self.log_result("Nonexistent User Handling", True, 
                                  "Correctly returned 404 for nonexistent user")
                    return True
                else:
                    self.log_result("Nonexistent User Handling", False, 
                                  f"Should have returned 404, got HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_result("Nonexistent User Handling", False, f"Exception: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Backend API Testing")
        print(f"📍 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # 1. Health Check
        await self.test_health_check()
        
        # 2. User Creation Tests
        for user_data in TEST_USERS:
            await self.test_create_user(user_data)
        
        # 3. User Retrieval Tests
        for user_data in TEST_USERS:
            await self.test_get_user(user_data["telegram_id"])
        
        # 4. User Update Tests
        if TEST_USERS:
            await self.test_update_user(TEST_USERS[0]["telegram_id"])
        
        # 5. Properties Tests
        for user_data in TEST_USERS:
            await self.test_get_properties(user_data["telegram_id"])
        
        # 6. Matches Tests
        for user_data in TEST_USERS:
            await self.test_get_matches(user_data["telegram_id"])
        
        # 7. Likes Tests (if we have created users)
        if len(self.created_users) >= 2:
            user1_id = TEST_USERS[0]["telegram_id"]
            user2_id = self.created_users[1]["id"]
            await self.test_create_like(user1_id, user2_id, "user")
        
        # 8. User Matches Tests
        for user_data in TEST_USERS:
            await self.test_get_user_matches(user_data["telegram_id"])
        
        # 9. Liked Properties Tests
        for user_data in TEST_USERS:
            await self.test_get_liked_properties(user_data["telegram_id"])
        
        # 10. Error Handling Tests
        await self.test_invalid_data()
        await self.test_nonexistent_user()
        
        # Print Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['details']}")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            print(f"   {result['status']}: {result['test']}")

async def main():
    """Main test runner"""
    async with BackendTester() as tester:
        await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())