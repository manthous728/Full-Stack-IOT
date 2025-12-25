import requests
import concurrent.futures
import time

API_URL = "http://localhost:8000"

def trigger_alert(i):
    try:
        start = time.time()
        # Simulated many concurrent alerts
        resp = requests.post(f"{API_URL}/notify/telegram/send", json={"message": f"Test Alert {i}"}, timeout=5)
        duration = time.time() - start
        return i, resp.status_code, duration
    except Exception as e:
        return i, str(e), 0

def check_health():
    try:
        start = time.time()
        resp = requests.get(f"{API_URL}/", timeout=2)
        duration = time.time() - start
        return resp.status_code, duration
    except Exception as e:
        return str(e), 0

def run_test():
    print("Testing API responsiveness...")
    
    # Check initial health
    status, duration = check_health()
    print(f"Initial health check: {status} ({duration:.4f}s)")
    
    # Trigger 10 concurrent alerts
    print("\nTriggering 10 concurrent alerts...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(trigger_alert, i) for i in range(10)]
        for future in concurrent.futures.as_completed(futures):
            i, status, duration = future.result()
            print(f"Alert {i}: Status {status}, Duration {duration:.4f}s")
            
    # Check health during/after alerts
    status, duration = check_health()
    print(f"\nFinal health check: {status} ({duration:.4f}s)")
    if duration < 0.1:
        print("SUCCESS: API is responsive even during background tasks.")
    else:
        print(f"WARNING: API took {duration:.4f}s to respond.")

if __name__ == "__main__":
    run_test()
