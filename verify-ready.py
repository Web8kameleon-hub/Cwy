#!/usr/bin/env python3
"""
CWY License System - Pre-Deployment Verification
Checks that everything is ready for production deployment
"""

import os
import sys
import json
from pathlib import Path

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text.center(60)}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def check_pass(msg):
    print(f"{GREEN}✅ {msg}{RESET}")
    return True

def check_fail(msg):
    print(f"{RED}❌ {msg}{RESET}")
    return False

def check_warn(msg):
    print(f"{YELLOW}⚠️  {msg}{RESET}")
    return True

def check_file_exists(filepath, required=True):
    """Check if file exists"""
    if os.path.exists(filepath):
        return check_pass(f"Found: {filepath}")
    else:
        if required:
            return check_fail(f"Missing: {filepath}")
        else:
            return check_warn(f"Optional: {filepath} not found")

def check_env_file():
    """Check .env file contents"""
    env_path = "backend/.env"
    
    if not os.path.exists(env_path):
        return check_fail(".env file missing!")
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    checks = [
        ("STRIPE_SECRET_KEY", "sk_"),
        ("STRIPE_WEBHOOK_SECRET", "whsec_"),
        ("STRIPE_PRICE_ID_PRO", "price_"),
        ("STRIPE_PRICE_ID_ENTERPRISE", "price_"),
    ]
    
    all_good = True
    for key, prefix in checks:
        if key in content:
            if f"{key}={prefix}" in content or f"{key}=PASTE" in content:
                check_fail(f"{key} not configured (still has placeholder)")
                all_good = False
            else:
                check_pass(f"{key} configured")
        else:
            check_fail(f"{key} missing from .env")
            all_good = False
    
    return all_good

def check_gitignore():
    """Check that .env is in .gitignore"""
    gitignore_path = "backend/.gitignore"
    
    if not os.path.exists(gitignore_path):
        return check_warn(".gitignore not found")
    
    with open(gitignore_path, 'r') as f:
        content = f.read()
    
    if ".env" in content:
        return check_pass(".env is in .gitignore (good!)")
    else:
        return check_fail(".env NOT in .gitignore (SECURITY RISK!)")

def check_achievement_file():
    """Check license_achievements.json"""
    ach_path = "backend/license_achievements.json"
    
    if not os.path.exists(ach_path):
        return check_fail("license_achievements.json missing")
    
    try:
        with open(ach_path, 'r') as f:
            data = json.load(f)
        
        if "achievements" in data:
            count = len(data["achievements"])
            check_pass(f"Found {count} achievements defined")
            return True
        else:
            return check_fail("Invalid achievement file format")
    except Exception as e:
        return check_fail(f"Error reading achievements: {e}")

def main():
    print_header("CWY LICENSE SYSTEM - PRE-DEPLOYMENT CHECK")
    
    results = []
    
    # Check 1: Backend files
    print(f"\n{YELLOW}[1/6] Backend Files{RESET}")
    results.append(check_file_exists("backend/stripe_webhook.py"))
    results.append(check_file_exists("backend/requirements.txt"))
    results.append(check_file_exists("backend/.env"))
    results.append(check_file_exists("backend/.env.example"))
    results.append(check_file_exists("backend/.gitignore"))
    
    # Check 2: Configuration
    print(f"\n{YELLOW}[2/6] Configuration{RESET}")
    results.append(check_env_file())
    results.append(check_gitignore())
    results.append(check_achievement_file())
    
    # Check 3: Documentation
    print(f"\n{YELLOW}[3/6] Documentation{RESET}")
    results.append(check_file_exists("MASTER_SUMMARY.md"))
    results.append(check_file_exists("DEPLOYMENT_CHECKLIST.md"))
    results.append(check_file_exists("DASHBOARD_INTEGRATION.md"))
    results.append(check_file_exists("backend/README.md"))
    
    # Check 4: Scripts
    print(f"\n{YELLOW}[4/6] Scripts{RESET}")
    results.append(check_file_exists("backend/start.bat"))
    results.append(check_file_exists("backend/test_backend.py"))
    results.append(check_file_exists("backend/deploy.sh", required=False))
    results.append(check_file_exists("launch.bat", required=False))
    
    # Check 5: CLI Integration
    print(f"\n{YELLOW}[5/6] CLI Integration{RESET}")
    results.append(check_file_exists("engines/licensing/license.ts"))
    results.append(check_file_exists("cli/cwy.ts"))
    
    # Check 6: Dashboard Integration
    print(f"\n{YELLOW}[6/6] Dashboard Integration{RESET}")
    results.append(check_file_exists("dashboard-license-integration-snippet.tsx"))
    
    # Summary
    print_header("VERIFICATION SUMMARY")
    
    passed = sum(results)
    total = len(results)
    
    print(f"Results: {passed}/{total} checks passed\n")
    
    if passed == total:
        print(f"{GREEN}✅ ALL CHECKS PASSED!{RESET}")
        print(f"{GREEN}System is ready for deployment! 🚀{RESET}\n")
        
        print("Next steps:")
        print("  1. Get STRIPE_SECRET_KEY from dashboard")
        print("  2. Update backend/.env")
        print("  3. Test locally: python backend/stripe_webhook.py")
        print("  4. Deploy: Follow DEPLOYMENT_CHECKLIST.md")
        print()
        return 0
    else:
        print(f"{RED}❌ Some checks failed{RESET}")
        print(f"{YELLOW}Please fix the issues above before deploying{RESET}\n")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nVerification interrupted.")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Error: {e}{RESET}")
        sys.exit(1)
