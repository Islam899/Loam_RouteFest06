# backend/app.py

import sqlite3
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def init_db():
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_time TEXT NOT NULL,
            duration INTEGER NOT NULL,
            location TEXT NOT NULL
        )
    ''')

    test_events = [
        ("Концерт группы 'Звездопад'", "12:00", 60, "Сцена А"),
        ("Мастер-класс по керамике", "12:30", 45, "Павильон Б"),
        ("Выступление комедийного дуэта", "13:00", 30, "Сцена Б"),
        ("Лекция о космосе", "13:30", 90, "Театр"),
        ("Фуд-корт: вкуснейшие бургеры", "14:00", 30, "Фуд-корт"),
        ("Воркшоп по йоге", "14:30", 60, "Зона релакса"),
        ("Дискотека под открытым небом", "18:00", 120, "Сцена А"),
        ("Показ документального фильма", "19:00", 75, "Кинозал"),
        ("Финальный концерт", "20:30", 90, "Сцена А"),
        ("Ночной тур по фестивалю", "22:00", 45, "Все локации")
    ]

    cursor.execute('DELETE FROM events')
    cursor.executemany('INSERT INTO events (name, start_time, duration, location) VALUES (?, ?, ?, ?)', test_events)

    conn.commit()
    conn.close()
    print("✅ База данных инициализирована.")

def get_all_events():
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, start_time, duration, location FROM events ORDER BY start_time')
    rows = cursor.fetchall()
    conn.close()

    events = []
    for row in rows:
        events.append({
            'id': row[0],
            'name': row[1],
            'start_time': row[2],
            'duration': row[3],
            'location': row[4]
        })
    return events

def has_conflict(event1, event2):
    try:
        start1 = datetime.strptime(event1['start_time'], '%H:%M').time()
        end1 = (datetime.strptime(event1['start_time'], '%H:%M') + timedelta(minutes=event1['duration'])).time()

        start2 = datetime.strptime(event2['start_time'], '%H:%M').time()
        end2 = (datetime.strptime(event2['start_time'], '%H:%M') + timedelta(minutes=event2['duration'])).time()

        return not (end1 <= start2 or end2 <= start1)
    except Exception as e:
        print(f"Ошибка при проверке конфликта: {e}")
        return True

def generate_routes(selected_event_ids, all_events, group_preferences=None, current_route=None):
    try:
        # Если есть групповые предпочтения, обрабатываем их
        if group_preferences and isinstance(group_preferences, list) and len(group_preferences) > 0:
            # Находим общие события для всех участников
            common_event_ids = None
            for prefs in group_preferences:
                if isinstance(prefs, dict) and 'selectedEventIds' in prefs:
                    user_selected = set(prefs['selectedEventIds'])
                    if common_event_ids is None:
                        common_event_ids = user_selected
                    else:
                        common_event_ids = common_event_ids & user_selected
            
            if not common_event_ids or len(common_event_ids) == 0:
                return []
            
            selected_event_ids = list(common_event_ids)
        
        # Если есть current_route, используем его как основу
        base_route = []
        if current_route and isinstance(current_route, list):
            base_route = [e for e in current_route if isinstance(e, dict) and e.get('id')]
            # Получаем ID событий из текущего маршрута
            base_event_ids = [e.get('id') for e in base_route if e.get('id')]
            # Удаляем из selected_event_ids те события, которые уже есть в current_route
            selected_event_ids = [eid for eid in selected_event_ids if eid not in base_event_ids]
        
        # Если нет выбранных событий и нет текущего маршрута
        if (not selected_event_ids or len(selected_event_ids) == 0) and not base_route:
            return []
        
        # Если есть только current_route без новых событий, возвращаем его
        if (not selected_event_ids or len(selected_event_ids) == 0) and base_route:
            return [base_route]

        # Получаем новые события (которые еще не в current_route)
        new_events = [e for e in all_events if e['id'] in selected_event_ids]
        new_events.sort(key=lambda x: x['start_time'])
        
        routes = []
        remaining_events = new_events.copy()
        
        # Если есть базовый маршрут, начинаем с него
        if base_route:
            # Создаем единый маршрут: base_route + новые события
            route = base_route.copy()
            last_event = route[-1] if route else None
            
            # Пытаемся добавить новые события к существующему маршруту
            for event in remaining_events[:]:
                if last_event is None:
                    route.append(event)
                    last_event = event
                    remaining_events.remove(event)
                else:
                    if not has_conflict(last_event, event):
                        if last_event['location'] == event['location']:
                            route.append(event)
                            last_event = event
                            remaining_events.remove(event)
                        else:
                            travel_time = 5
                            last_end = (datetime.strptime(last_event['start_time'], '%H:%M') + timedelta(minutes=last_event['duration'])).time()
                            event_start = datetime.strptime(event['start_time'], '%H:%M').time()
                            last_end_dt = datetime.combine(datetime.today(), last_end)
                            event_start_dt = datetime.combine(datetime.today(), event_start)
                            if (event_start_dt - last_end_dt) >= timedelta(minutes=travel_time):
                                route.append(event)
                                last_event = event
                                remaining_events.remove(event)
            
            if route:
                routes.append(route)
        else:
            # Обычная логика генерации маршрутов (без current_route)
            while remaining_events:
                route = []
                last_event = None
                
                for event in remaining_events[:]:
                    if last_event is None:
                        route.append(event)
                        last_event = event
                        remaining_events.remove(event)
                    else:
                        if not has_conflict(last_event, event):
                            if last_event['location'] == event['location']:
                                route.append(event)
                                last_event = event
                                remaining_events.remove(event)
                            else:
                                travel_time = 5
                                last_end = (datetime.strptime(last_event['start_time'], '%H:%M') + timedelta(minutes=last_event['duration'])).time()
                                event_start = datetime.strptime(event['start_time'], '%H:%M').time()
                                last_end_dt = datetime.combine(datetime.today(), last_end)
                                event_start_dt = datetime.combine(datetime.today(), event_start)
                                if (event_start_dt - last_end_dt) >= timedelta(minutes=travel_time):
                                    route.append(event)
                                    last_event = event
                                    remaining_events.remove(event)
                
                if route:
                    routes.append(route)

        return routes

    except Exception as e:
        print(f"❌ Ошибка в generate_routes: {e}")
        return []

@app.route('/api/events', methods=['GET'])
def api_get_events():
    try:
        events = get_all_events()
        return jsonify(events)
    except Exception as e:
        print(f"❌ Ошибка в /api/events: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-routes', methods=['POST'])
@app.route('/api/generate-routes', methods=['POST'])
def api_generate_routes():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        selected_event_ids = data.get('selectedEventIds', [])
        group_preferences = data.get('groupPreferences', None)
        current_route = data.get('currentRoute', None)

        # 🔥 Убираем проверку для группового сценария
        # if not selected_event_ids:
        #     return jsonify({'error': 'No events selected'}), 400

        all_events = get_all_events()
        routes = generate_routes(selected_event_ids, all_events, group_preferences, current_route)

        response = {'routes': [], 'totalRoutes': len(routes)}
        for i, route in enumerate(routes):
            route_info = {
                'id': i + 1,
                'events': route,
                'totalDuration': sum(e['duration'] for e in route),
                'eventCount': len(route)
            }
            response['routes'].append(route_info)

        return jsonify(response)

    except Exception as e:
        print(f"❌ Ошибка в /api/generate-routes: {e}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/')
def home():
    return "✅ API работает!"

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)