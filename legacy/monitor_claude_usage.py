#!/usr/bin/env python3
"""
Monitor Claude API usage in real-time with alerts
"""

import os
import sys
import time
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Set
import json
import platform

# ANSI color codes
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Alert thresholds
ALERT_THRESHOLDS = [15, 30, 50, 80, 90, 95, 98]

# Reset windows
RESET_WINDOWS = {
    "5_hours": {
        "hours": 5,
        "label": "5 horas"
    },
    "7_days": {
        "days": 7,
        "label": "7 dias"
    }
}

def clear_screen():
    """Clear terminal screen"""
    os.system('cls' if os.name == 'nt' else 'clear')

def play_alert_sound():
    """Play system alert sound"""
    try:
        if platform.system() == 'Windows':
            import winsound
            # Play beep sound (frequency, duration in ms)
            winsound.Beep(1000, 500)  # 1000Hz for 500ms
        elif platform.system() == 'Darwin':  # macOS
            os.system('afplay /System/Library/Sounds/Glass.aiff')
        else:  # Linux
            os.system('play -nq -t alsa synth 0.3 sine 1000')
    except Exception:
        # Fallback: print bell character
        print('\a', end='', flush=True)

def format_number(num):
    """Format large numbers with thousands separator"""
    return f"{num:,}"

def calculate_percentage(current: int, limit: int) -> float:
    """Calculate percentage of usage"""
    if limit == 0:
        return 0
    return (current / limit) * 100

def get_progress_bar(percentage: float, width: int = 30) -> str:
    """Create a visual progress bar"""
    filled = int((percentage / 100) * width)
    bar = '█' * filled + '░' * (width - filled)
    return f"[{bar}]"

def get_alert_color(percentage: float) -> str:
    """Get color based on percentage"""
    if percentage >= 98:
        return Colors.RED
    elif percentage >= 95:
        return Colors.RED
    elif percentage >= 90:
        return Colors.RED
    elif percentage >= 80:
        return Colors.YELLOW
    elif percentage >= 50:
        return Colors.YELLOW
    elif percentage >= 30:
        return Colors.BLUE
    else:
        return Colors.GREEN

def check_and_trigger_alerts(percentage: float, alert_type: str, triggered_alerts: Set[str]) -> Optional[str]:
    """
    Check if any alert threshold is reached and trigger alert

    Args:
        percentage: Current usage percentage
        alert_type: Type of alert (e.g., "5_hours", "7_days")
        triggered_alerts: Set to track which alerts have been triggered

    Returns:
        Alert message if threshold reached, None otherwise
    """
    for threshold in ALERT_THRESHOLDS:
        if percentage >= threshold:
            alert_key = f"{alert_type}_{threshold}"
            if alert_key not in triggered_alerts:
                triggered_alerts.add(alert_key)
                return threshold
    return None

def format_reset_time(reset_type: str) -> str:
    """Format when the limit resets"""
    if reset_type == "5_hours":
        reset_time = datetime.now() + timedelta(hours=5)
    else:  # 7_days
        reset_time = datetime.now() + timedelta(days=7)

    return reset_time.strftime("%Y-%m-%d %H:%M:%S")

def get_claude_usage(api_key: str) -> Optional[dict]:
    """
    Fetch Claude API usage from Anthropic API
    """
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        response = requests.get(
            "https://api.anthropic.com/v1/usage",
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            return response.json()
        else:
            return None
    except Exception as e:
        print(f"Error fetching usage: {e}")
        return None

def format_usage_display(usage_data: dict, triggered_alerts: Set[str]) -> str:
    """Format usage data for terminal display with alerts"""
    if not usage_data:
        return "Unable to fetch usage data"

    output = []
    output.append(f"\n{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}")
    output.append(f"{Colors.BOLD}{Colors.CYAN}         CLAUDE API USAGE MONITOR WITH ALERTS{Colors.ENDC}")
    output.append(f"{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}\n")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    output.append(f"{Colors.YELLOW}Updated at: {timestamp}{Colors.ENDC}\n")

    # Process each agent type (5 hours and 7 days)
    agents_data = usage_data.get("agents", {})

    for agent_type in ["5_hours", "7_days"]:
        reset_label = RESET_WINDOWS[agent_type]["label"]
        agent_info = agents_data.get(agent_type, {})

        if agent_info:
            usage = agent_info.get("usage", 0)
            limit = agent_info.get("limit", 1)
            percentage = calculate_percentage(usage, limit)

            color = get_alert_color(percentage)
            progress_bar = get_progress_bar(percentage)

            output.append(f"{Colors.BOLD}Agent (Reseta em {reset_label}):{Colors.ENDC}")
            output.append(f"  {color}Uso: {format_number(usage)} / {format_number(limit)} tokens{Colors.ENDC}")
            output.append(f"  {color}{progress_bar} {percentage:.2f}%{Colors.ENDC}")
            output.append(f"  Reseta em: {format_reset_time(agent_type)}\n")

            # Show triggered alerts for this agent
            active_alerts = [int(a.split("_")[-1]) for a in triggered_alerts if a.startswith(f"{agent_type}_")]
            if active_alerts:
                active_alerts.sort()
                alert_text = ", ".join([f"{a}%" for a in active_alerts])
                output.append(f"  {Colors.RED}{Colors.BOLD}⚠️  ALERTAS DISPARADOS: {alert_text}{Colors.ENDC}\n")
        else:
            output.append(f"{Colors.BOLD}Agent (Reseta em {reset_label}):{Colors.ENDC}")
            output.append(f"  {Colors.YELLOW}Dados não disponíveis{Colors.ENDC}\n")

    # Input tokens
    if "input_tokens" in usage_data:
        input_tokens = usage_data["input_tokens"]
        output.append(f"{Colors.BOLD}{Colors.BLUE}Input Tokens:{Colors.ENDC}")
        output.append(f"  {Colors.GREEN}Total: {format_number(input_tokens.get('total', 0))}{Colors.ENDC}")
        output.append(f"  Cache created: {format_number(input_tokens.get('cache_creation', 0))}")
        output.append(f"  Cache read: {format_number(input_tokens.get('cache_read', 0))}\n")

    # Output tokens
    if "output_tokens" in usage_data:
        output_tokens = usage_data["output_tokens"]
        output.append(f"{Colors.BOLD}{Colors.BLUE}Output Tokens:{Colors.ENDC}")
        output.append(f"  {Colors.GREEN}Total: {format_number(output_tokens.get('total', 0))}{Colors.ENDC}\n")

    # Combined stats
    total_input = usage_data.get("input_tokens", {}).get("total", 0)
    total_output = usage_data.get("output_tokens", {}).get("total", 0)
    combined = total_input + total_output

    output.append(f"{Colors.BOLD}{Colors.GREEN}Combined Tokens: {format_number(combined)}{Colors.ENDC}")
    output.append(f"{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}\n")

    return "\n".join(output)

def monitor_usage(api_key: str, interval: int = 5):
    """
    Monitor Claude API usage with real-time updates and alerts

    Args:
        api_key: Anthropic API key
        interval: Update interval in seconds
    """

    if not api_key:
        print(f"{Colors.RED}Error: ANTHROPIC_API_KEY environment variable not set{Colors.ENDC}")
        sys.exit(1)

    print(f"{Colors.GREEN}Starting Claude API usage monitor...{Colors.ENDC}")
    print(f"Refresh interval: {interval} seconds")
    print("Alertas configurados para: 15%, 30%, 50%, 80%, 90%, 95%, 98%")
    print("Press Ctrl+C to exit\n")

    try:
        iteration = 0
        triggered_alerts: Set[str] = set()
        last_alerts_log = {}

        while True:
            clear_screen()

            usage_data = get_claude_usage(api_key)

            # Check for new alerts
            if usage_data and "agents" in usage_data:
                agents_data = usage_data["agents"]

                for agent_type in ["5_hours", "7_days"]:
                    agent_info = agents_data.get(agent_type, {})
                    if agent_info:
                        usage = agent_info.get("usage", 0)
                        limit = agent_info.get("limit", 1)
                        percentage = calculate_percentage(usage, limit)

                        # Check for alerts
                        alert_threshold = check_and_trigger_alerts(
                            percentage,
                            agent_type,
                            triggered_alerts
                        )

                        if alert_threshold:
                            play_alert_sound()
                            alert_key = f"{agent_type}_{alert_threshold}"
                            last_alerts_log[alert_key] = {
                                "percentage": percentage,
                                "timestamp": datetime.now()
                            }

            display = format_usage_display(usage_data, triggered_alerts)
            print(display)

            # Log recent alerts
            if last_alerts_log:
                output = f"{Colors.RED}{Colors.BOLD}RECENT ALERTS:{Colors.ENDC}\n"
                for alert_key, alert_info in list(last_alerts_log.items())[-5:]:
                    time_ago = (datetime.now() - alert_info["timestamp"]).total_seconds()
                    output += f"  • {alert_key}: {alert_info['percentage']:.2f}% (há {int(time_ago)}s)\n"
                print(output)

            iteration += 1
            print(f"{Colors.YELLOW}Iteration: {iteration} | Next update in {interval}s...{Colors.ENDC}")

            time.sleep(interval)

    except KeyboardInterrupt:
        clear_screen()
        print(f"\n{Colors.YELLOW}Monitor stopped by user{Colors.ENDC}")
        sys.exit(0)

def main():
    """Main entry point"""

    # Get API key from environment
    api_key = os.getenv("ANTHROPIC_API_KEY")

    # Check for command line arguments
    interval = 5
    if len(sys.argv) > 1:
        try:
            interval = int(sys.argv[1])
        except ValueError:
            print(f"{Colors.RED}Invalid interval. Using default: 5 seconds{Colors.ENDC}")

    monitor_usage(api_key, interval)

if __name__ == "__main__":
    main()
