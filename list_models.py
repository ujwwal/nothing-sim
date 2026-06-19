#!/usr/bin/env python3
import os
import json
import urllib.request

def main():
    # Find .env file in the same directory as this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '.env')
    
    api_key = None
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('NEXT_PUBLIC_GEMINI_API_KEY='):
                    api_key = line.split('=', 1)[1].strip('"\' ')
                    break
                    
    # Fallback to system environment variable
    if not api_key:
        api_key = os.environ.get('NEXT_PUBLIC_GEMINI_API_KEY')
        
    if not api_key:
        print("\033[91mError: NEXT_PUBLIC_GEMINI_API_KEY not found in .env or environment.\033[0m")
        print("Please ensure you have a .env file containing:")
        print("NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here")
        return

    print(f"\033[94mQuerying Gemini models API...\033[0m")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Aegis-Sim Model Check)'}
        )
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            models = res_data.get('models', [])
            
            if not models:
                print("No models returned by the API.")
                return
                
            print(f"\n\033[92mSuccess! Found {len(models)} models available for this API key:\033[0m\n")
            print(f"{'\033[1mModel ID':<45} | {'Supported Actions':<45} | {'Description\033[0m'}")
            print("-" * 120)
            
            for model in models:
                name = model.get('name', '').replace('models/', '')
                actions = ", ".join(model.get('supportedGenerationMethods', []))
                description = model.get('description', '')
                # Truncate description for clean CLI display
                if len(description) > 50:
                    description = description[:47] + "..."
                print(f"{name:<35} | {actions:<35} | {description}")
                
    except urllib.error.HTTPError as e:
        print(f"\033[91mHTTP Error {e.code}: {e.reason}\033[0m")
        try:
            err_body = e.read().decode('utf-8')
            err_json = json.loads(err_body)
            print(f"Details: {err_json.get('error', {}).get('message', 'Unknown error')}")
        except:
            pass
    except Exception as e:
        print(f"\033[91mFailed to retrieve models: {e}\033[0m")

if __name__ == '__main__':
    main()
