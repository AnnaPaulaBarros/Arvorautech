import requests
import json
import sys
from datetime import datetime
import time

class ArvouraTechAPITester:
    def __init__(self, base_url="https://arbortech-preview.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = "test_session_1772814897224"  # From MongoDB creation
        self.user_id = "test-user-1772814897224"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, name, success, details=""):
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = f"{status} - {name}"
        if details:
            result += f": {details}"
        print(result)
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })
        return success

    def make_request(self, method, endpoint, data=None, files=None, expected_status=200):
        """Make API request with authentication"""
        url = f"{self.api_url}{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.session_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    headers.pop('Content-Type', None)  # Let requests set it for multipart
                    response = requests.post(url, files=files, headers=headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            
            success = response.status_code == expected_status
            
            try:
                json_response = response.json() if response.content else {}
            except:
                json_response = {"raw_response": response.text}
            
            return success, json_response, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_root_endpoint(self):
        """Test API root endpoint"""
        print("\n🔍 Testing API Root Endpoint...")
        success, response, status = self.make_request("GET", "/")
        return self.log_result(
            "API Root", 
            success and response.get("message") == "ArvouraTech API",
            f"Status: {status}, Response: {response}"
        )

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        print("\n🔍 Testing Authentication...")
        success, response, status = self.make_request("GET", "/auth/me")
        
        if success and response.get("user_id") == self.user_id:
            return self.log_result(
                "Auth Me", 
                True,
                f"User authenticated: {response.get('name')}"
            )
        else:
            return self.log_result(
                "Auth Me", 
                False,
                f"Status: {status}, Response: {response}"
            )

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        print("\n🔍 Testing Dashboard Stats...")
        success, response, status = self.make_request("GET", "/dashboard/stats")
        
        expected_keys = ["total_trees", "total_maintenance", "recent_trees", "recent_maintenance", "maintenance_by_type"]
        has_keys = all(key in response for key in expected_keys)
        
        return self.log_result(
            "Dashboard Stats",
            success and has_keys,
            f"Status: {status}, Keys present: {has_keys}"
        )

    def test_trees_crud(self):
        """Test complete tree CRUD operations"""
        print("\n🔍 Testing Trees CRUD Operations...")
        
        # 1. Create Tree
        tree_data = {
            "name": "Test Tree " + str(int(time.time())),
            "species": "Test Species",
            "height": 5.0,
            "diameter": 30.0,
            "latitude": -23.5505,
            "longitude": -46.6333,
            "planting_date": "2024-01-15",
            "notes": "Test tree for API testing"
        }
        
        success, response, status = self.make_request("POST", "/trees", tree_data, expected_status=200)
        
        if not success:
            return self.log_result(
                "Trees CRUD - Create",
                False,
                f"Create failed - Status: {status}, Response: {response}"
            )
        
        tree_id = response.get("tree_id")
        if not tree_id:
            return self.log_result(
                "Trees CRUD - Create",
                False,
                "No tree_id in response"
            )
        
        self.log_result("Trees CRUD - Create", True, f"Created tree: {tree_id}")
        
        # 2. Get All Trees
        success, response, status = self.make_request("GET", "/trees")
        trees_found = isinstance(response, list) and any(t.get("tree_id") == tree_id for t in response)
        
        self.log_result(
            "Trees CRUD - Get All",
            success and trees_found,
            f"Status: {status}, Trees count: {len(response) if isinstance(response, list) else 0}"
        )
        
        # 3. Get Specific Tree
        success, response, status = self.make_request("GET", f"/trees/{tree_id}")
        tree_details_correct = response.get("tree_id") == tree_id and response.get("name") == tree_data["name"]
        
        self.log_result(
            "Trees CRUD - Get Specific",
            success and tree_details_correct,
            f"Status: {status}, Tree found: {tree_details_correct}"
        )
        
        # 4. Update Tree
        update_data = {"name": "Updated Test Tree", "height": 6.0}
        success, response, status = self.make_request("PUT", f"/trees/{tree_id}", update_data)
        update_successful = response.get("name") == update_data["name"] and response.get("height") == update_data["height"]
        
        self.log_result(
            "Trees CRUD - Update",
            success and update_successful,
            f"Status: {status}, Update successful: {update_successful}"
        )
        
        # 5. Delete Tree
        success, response, status = self.make_request("DELETE", f"/trees/{tree_id}")
        
        self.log_result(
            "Trees CRUD - Delete",
            success,
            f"Status: {status}, Response: {response.get('message', '')}"
        )
        
        return tree_id

    def test_maintenance_crud(self):
        """Test maintenance CRUD operations"""
        print("\n🔍 Testing Maintenance CRUD Operations...")
        
        # First create a tree for maintenance
        tree_data = {
            "name": "Maintenance Test Tree",
            "species": "Test Species",
            "height": 4.0
        }
        
        success, tree_response, status = self.make_request("POST", "/trees", tree_data)
        if not success:
            return self.log_result(
                "Maintenance CRUD - Setup",
                False,
                "Failed to create test tree for maintenance"
            )
        
        tree_id = tree_response.get("tree_id")
        
        # Create Maintenance Record
        maintenance_data = {
            "tree_id": tree_id,
            "maintenance_type": "poda",
            "date": "2024-01-20",
            "notes": "Test pruning maintenance"
        }
        
        success, response, status = self.make_request("POST", "/maintenance", maintenance_data)
        
        if not success:
            # Clean up tree
            self.make_request("DELETE", f"/trees/{tree_id}")
            return self.log_result(
                "Maintenance CRUD - Create",
                False,
                f"Status: {status}, Response: {response}"
            )
        
        maintenance_id = response.get("maintenance_id")
        self.log_result(
            "Maintenance CRUD - Create",
            True,
            f"Created maintenance: {maintenance_id}"
        )
        
        # Get Tree Maintenance
        success, response, status = self.make_request("GET", f"/maintenance/tree/{tree_id}")
        maintenance_found = isinstance(response, list) and any(m.get("maintenance_id") == maintenance_id for m in response)
        
        self.log_result(
            "Maintenance CRUD - Get Tree Maintenance",
            success and maintenance_found,
            f"Status: {status}, Maintenance records: {len(response) if isinstance(response, list) else 0}"
        )
        
        # Get User Maintenance
        success, response, status = self.make_request("GET", "/maintenance")
        user_maintenance_found = isinstance(response, list) and any(m.get("maintenance_id") == maintenance_id for m in response)
        
        self.log_result(
            "Maintenance CRUD - Get User Maintenance",
            success and user_maintenance_found,
            f"Status: {status}, User maintenance records: {len(response) if isinstance(response, list) else 0}"
        )
        
        # Delete Maintenance
        success, response, status = self.make_request("DELETE", f"/maintenance/{maintenance_id}")
        
        self.log_result(
            "Maintenance CRUD - Delete",
            success,
            f"Status: {status}, Response: {response.get('message', '')}"
        )
        
        # Clean up tree
        self.make_request("DELETE", f"/trees/{tree_id}")
        
        return maintenance_id

    def test_photo_upload(self):
        """Test photo upload functionality"""
        print("\n🔍 Testing Photo Upload...")
        
        # Create a test tree first
        tree_data = {
            "name": "Photo Test Tree",
            "species": "Test Species"
        }
        
        success, tree_response, status = self.make_request("POST", "/trees", tree_data)
        if not success:
            return self.log_result(
                "Photo Upload - Setup",
                False,
                "Failed to create test tree for photo"
            )
        
        tree_id = tree_response.get("tree_id")
        
        # Create a simple test image file (1x1 pixel PNG)
        import base64
        test_image_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_image.png', test_image_data, 'image/png')
        }
        
        # Upload photo
        url = f"{self.api_url}/trees/{tree_id}/photo"
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        try:
            response = requests.post(url, files=files, headers=headers, timeout=60)
            success = response.status_code == 200
            
            if success:
                photo_data = response.json()
                photo_id = photo_data.get("photo_id")
                self.log_result(
                    "Photo Upload - Upload",
                    True,
                    f"Photo uploaded: {photo_id}"
                )
                
                # Test photo retrieval
                success, photo_response, status = self.make_request("GET", f"/photos/{photo_id}")
                self.log_result(
                    "Photo Upload - Retrieve",
                    success,
                    f"Status: {status}"
                )
                
            else:
                self.log_result(
                    "Photo Upload - Upload",
                    False,
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_result(
                "Photo Upload - Upload",
                False,
                f"Exception: {str(e)}"
            )
        
        # Clean up tree
        self.make_request("DELETE", f"/trees/{tree_id}")

    def test_role_switching(self):
        """Test user role switching"""
        print("\n🔍 Testing Role Switching...")
        
        # Update role to agronomist
        role_data = {"role": "agronomist"}
        success, response, status = self.make_request("PUT", "/auth/role", role_data)
        
        role_updated = response.get("role") == "agronomist"
        self.log_result(
            "Role Switching - To Agronomist",
            success and role_updated,
            f"Status: {status}, New role: {response.get('role')}"
        )
        
        # Test agronomist-only endpoint
        success, response, status = self.make_request("GET", "/trees/all")
        
        self.log_result(
            "Role Switching - Agronomist Access",
            success,
            f"Status: {status}, Trees accessible: {isinstance(response, list)}"
        )
        
        # Switch back to client
        role_data = {"role": "client"}
        success, response, status = self.make_request("PUT", "/auth/role", role_data)
        
        role_updated = response.get("role") == "client"
        self.log_result(
            "Role Switching - Back to Client",
            success and role_updated,
            f"Status: {status}, New role: {response.get('role')}"
        )

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting ArvouraTech Backend API Tests")
        print("=" * 60)
        
        # Core API tests
        self.test_root_endpoint()
        self.test_auth_me()
        self.test_dashboard_stats()
        
        # CRUD operations
        self.test_trees_crud()
        self.test_maintenance_crud()
        
        # Advanced features
        self.test_photo_upload()
        self.test_role_switching()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = ArvouraTechAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())