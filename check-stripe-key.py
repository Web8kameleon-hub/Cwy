"""
Quick verification script - Check if Stripe key is configured
"""
import os
from pathlib import Path

def verify_stripe_key():
    env_file = Path("backend/.env")
    
    if not env_file.exists():
        print("❌ .env file not found!")
        return False
    
    with open(env_file) as f:
        content = f.read()
    
    # Check if STRIPE_SECRET_KEY is set
    if "STRIPE_SECRET_KEY=sk_live_PASTE" in content:
        print("❌ Stripe Secret Key NOT configured!")
        print("   Open backend/.env and paste the real key on line 7")
        return False
    
    if "STRIPE_SECRET_KEY=sk_live_" in content:
        # Extract key length (should be ~100 chars)
        for line in content.split('\n'):
            if line.startswith('STRIPE_SECRET_KEY='):
                key = line.split('=')[1].strip()
                if len(key) > 50:  # Real key is long
                    print("✅ Stripe Secret Key configured!")
                    print(f"   Key length: {len(key)} chars")
                    print(f"   Preview: {key[:20]}...{key[-10:]}")
                    return True
                else:
                    print("⚠️  Key seems too short!")
                    print(f"   Current: {key}")
                    return False
    
    print("❌ Could not find STRIPE_SECRET_KEY in .env")
    return False

if __name__ == "__main__":
    print("\n" + "="*50)
    print("🔍 VERIFYING STRIPE CONFIGURATION")
    print("="*50 + "\n")
    
    if verify_stripe_key():
        print("\n✅ READY TO TEST!")
        print("\nNext step:")
        print("   cd backend")
        print("   python stripe_webhook.py")
    else:
        print("\n⚠️  CONFIGURATION NEEDED")
        print("\nSteps:")
        print("   1. Reveal secret key in Stripe dashboard")
        print("   2. Copy the full key (sk_live_...)")
        print("   3. Paste in backend/.env line 7")
        print("   4. Run this script again")
    
    print("\n" + "="*50 + "\n")

verify_stripe_key()
