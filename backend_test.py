#!/usr/bin/env python3
"""
Backend API Test Script for Creatools Bug Fix Verification
Tests the /api/ui-config endpoint fix and related setup endpoints
"""

import requests
import json
import sys

# Backend URL
BASE_URL = "http://127.0.0.1:8081"

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(passed, message):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")

def test_ui_config():
    """Test GET /api/ui-config - should return 200 JSON with default config"""
    print_test_header("GET /api/ui-config")
    
    try:
        response = requests.get(f"{BASE_URL}/api/ui-config", timeout=10)
        
        # Check status code
        if response.status_code != 200:
            print_result(False, f"Expected status 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        # Check Content-Type
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            print_result(False, f"Expected Content-Type: application/json, got {content_type}")
            print(f"Response: {response.text[:500]}")
            return False
        
        # Check if response is HTML (bug symptom)
        if response.text.strip().startswith('<!DOCTYPE') or response.text.strip().startswith('<html'):
            print_result(False, "Response is HTML instead of JSON (BUG NOT FIXED)")
            print(f"Response: {response.text[:500]}")
            return False
        
        # Parse JSON
        try:
            data = response.json()
        except json.JSONDecodeError as e:
            print_result(False, f"Failed to parse JSON: {e}")
            print(f"Response: {response.text[:500]}")
            return False
        
        # Check required fields
        required_fields = ['navType', 'primaryColor', 'logoText', 'sidebarSections']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            print_result(False, f"Missing required fields: {missing_fields}")
            print(f"Response data: {json.dumps(data, indent=2)[:500]}")
            return False
        
        # Check if _dbError field is present (indicates DB is not available but graceful fallback)
        if '_dbError' in data:
            print_result(True, "Returns default config with _dbError field (graceful DB error handling)")
            print(f"DB Error: {data['_dbError']}")
        else:
            print_result(True, "Returns config successfully")
        
        print(f"Response fields: {list(data.keys())}")
        print(f"navType: {data.get('navType')}")
        print(f"primaryColor: {data.get('primaryColor')}")
        print(f"logoText: {data.get('logoText')}")
        print(f"sidebarSections count: {len(data.get('sidebarSections', []))}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print_result(False, f"Request failed: {e}")
        return False

def test_setup_status():
    """Test GET /api/setup/status - should return 200 JSON"""
    print_test_header("GET /api/setup/status")
    
    try:
        response = requests.get(f"{BASE_URL}/api/setup/status", timeout=10)
        
        if response.status_code != 200:
            print_result(False, f"Expected status 200, got {response.status_code}")
            return False
        
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            print_result(False, f"Expected Content-Type: application/json, got {content_type}")
            return False
        
        data = response.json()
        print_result(True, "Returns setup status successfully")
        print(f"Response fields: {list(data.keys())}")
        
        return True
        
    except Exception as e:
        print_result(False, f"Request failed: {e}")
        return False

def test_db_connection():
    """Test POST /api/setup/test-db - should return 200 JSON with ok: false"""
    print_test_header("POST /api/setup/test-db")
    
    payload = {
        "host": "localhost",
        "port": 5432,
        "user": "nobody",
        "database": "nobody"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/setup/test-db",
            json=payload,
            timeout=10
        )
        
        if response.status_code != 200:
            print_result(False, f"Expected status 200, got {response.status_code}")
            return False
        
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            print_result(False, f"Expected Content-Type: application/json, got {content_type}")
            return False
        
        data = response.json()
        
        if 'ok' not in data:
            print_result(False, "Response missing 'ok' field")
            return False
        
        if data['ok'] is not False:
            print_result(False, f"Expected ok: false, got ok: {data['ok']}")
            return False
        
        print_result(True, "Returns error response gracefully")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        return True
        
    except Exception as e:
        print_result(False, f"Request failed: {e}")
        return False

def test_llm_validation():
    """Test POST /api/setup/test-llm - should return 200 JSON with ok: true"""
    print_test_header("POST /api/setup/test-llm")
    
    payload = {
        "key": "sk-emergent-test123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/setup/test-llm",
            json=payload,
            timeout=10
        )
        
        if response.status_code != 200:
            print_result(False, f"Expected status 200, got {response.status_code}")
            return False
        
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            print_result(False, f"Expected Content-Type: application/json, got {content_type}")
            return False
        
        data = response.json()
        
        if 'ok' not in data:
            print_result(False, "Response missing 'ok' field")
            return False
        
        if data['ok'] is not True:
            print_result(False, f"Expected ok: true, got ok: {data['ok']}")
            return False
        
        print_result(True, "Validates LLM key format successfully")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        return True
        
    except Exception as e:
        print_result(False, f"Request failed: {e}")
        return False

def test_api_validation():
    """Test POST /api/setup/test-api - should return 200 JSON with ok: false"""
    print_test_header("POST /api/setup/test-api")
    
    payload = {
        "apiKey": "fake"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/setup/test-api",
            json=payload,
            timeout=10
        )
        
        if response.status_code != 200:
            print_result(False, f"Expected status 200, got {response.status_code}")
            return False
        
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            print_result(False, f"Expected Content-Type: application/json, got {content_type}")
            return False
        
        data = response.json()
        
        if 'ok' not in data:
            print_result(False, "Response missing 'ok' field")
            return False
        
        if data['ok'] is not False:
            print_result(False, f"Expected ok: false, got ok: {data['ok']}")
            return False
        
        print_result(True, "Returns error response for invalid API key")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        return True
        
    except Exception as e:
        print_result(False, f"Request failed: {e}")
        return False

def test_proxy_health():
    """Test GET /api/_proxy/health - should return 200 JSON"""
    print_test_header("GET /api/_proxy/health")
    
    try:
        response = requests.get(f"{BASE_URL}/api/_proxy/health", timeout=10)
        
        if response.status_code != 200:
            print_result(False, f"Expected status 200, got {response.status_code}")
            return False
        
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            print_result(False, f"Expected Content-Type: application/json, got {content_type}")
            return False
        
        data = response.json()
        
        if 'proxy' not in data:
            print_result(False, "Response missing 'proxy' field")
            return False
        
        print_result(True, "Returns health status successfully")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        return True
        
    except Exception as e:
        print_result(False, f"Request failed: {e}")
        return False

def main():
    print("\n" + "="*80)
    print("CREATOOLS BUG FIX VERIFICATION TEST SUITE")
    print("Testing /api/ui-config fix and related endpoints")
    print("="*80)
    
    results = {
        "GET /api/ui-config": test_ui_config(),
        "GET /api/setup/status": test_setup_status(),
        "POST /api/setup/test-db": test_db_connection(),
        "POST /api/setup/test-llm": test_llm_validation(),
        "POST /api/setup/test-api": test_api_validation(),
        "GET /api/_proxy/health": test_proxy_health(),
    }
    
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - BUG FIX VERIFIED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
