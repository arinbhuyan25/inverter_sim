import requests
import json

JWT = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcmp1bmJvcmEwOTlAZ21haWwuY29tIiwidXNlcklkIjoiNTYyYTg0MzAtMzgxZC0xMWYxLWJhNDQtYzU0YWIxZDdmMWY0Iiwic2NvcGVzIjpbIlRFTkFOVF9BRE1JTiJdLCJzZXNzaW9uSWQiOiJiZDRjY2RlMC04YjA3LTQyMGYtOWQyNi1kYTUyODMxNWEzYmMiLCJleHAiOjE3NzYyOTY1MzQsImlzcyI6ImV1LnRoaW5nc2JvYXJkLmNsb3VkIiwiaWF0IjoxNzc2MjY3NzM0LCJmaXJzdE5hbWUiOiJBcmp1biIsImxhc3ROYW1lIjoiQm9yYSIsImVuYWJsZWQiOnRydWUsImlzUHVibGljIjpmYWxzZSwiaXNCaWxsaW5nU2VydmljZSI6ZmFsc2UsInByaXZhY3lQb2xpY3lBY2NlcHRlZCI6dHJ1ZSwidGVybXNPZlVzZUFjY2VwdGVkIjp0cnVlLCJ0ZW5hbnRJZCI6IjU2MGQxMTIwLTM4MWQtMTFmMS1iYTQ0LWM1NGFiMWQ3ZjFmNCIsImN1c3RvbWVySWQiOiIxMzgxNDAwMC0xZGQyLTExYjItODA4MC04MDgwODA4MDgwODAifQ.HtGSj5eyIXXd3krvwh7-Lu0Q-8PPKg9vSCgka7w2eLl9-48A1IYaz92iwTpdkTbrwGqZdgmOGlM6DPExc6GfKg"
HOST = "eu.thingsboard.cloud"

headers = {
    'X-Authorization': f'Bearer {JWT}'
}

# List devices to find INV_001
url = f"https://{HOST}/api/tenant/devices?pageSize=100&page=0"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    devices = response.json().get('data', [])
    for d in devices:
        print(f"Found Device: {d['name']} | ID: {d['id']['id']}")
else:
    print(f"Error: {response.status_code} - {response.text}")
