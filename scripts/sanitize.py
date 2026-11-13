import paths  # sets cwd to data/work and defines repo paths
import re,html
from html.parser import HTMLParser
EMOJI={'slightly_smiling_face':'🙂','smile':'😄','sweat_smile':'😅','joy':'😂','wink':'😉','heart':'❤️','tada':'🎉','rocket':'🚀','thumbsup':'👍','+1':'👍','point_right':'👉','point_up':'☝️','thinking_face':'🤔','grin':'😁','raised_hands':'🙌','eyes':'👀','pray':'🙏','sparkles':'✨','fire':'🔥','wave':'👋','movie_camera':'🎥','memo':'📝','turtle':'🐢','bulb':'💡','link':'🔗','thread':'🧵','zap':'⚡','star':'⭐','smiley':'😃','nerd_face':'🤓','stuck_out_tongue':'😛','relaxed':'☺️','heart_eyes':'😍','hugging_face':'🤗','100':'💯','white_check_mark':'✅','x':'❌','warning':'⚠️','satellite_antenna':'📡','studio_microphone':'🎙️','writing_hand':'✍️','books':'📚','technologist':'🧑‍💻','first_place_medal':'🥇','second_place_medal':'🥈','third_place_medal':'🥉','robot_face':'🤖','partying_face':'🥳','muscle':'💪','sunglasses':'😎','scream':'😱','flushed':'😳','sob':'😭','clap':'👏','hammer_and_wrench':'🛠️','dna':'🧬','speech_balloon':'💬','fish':'🐟','bee':'🐝','game_die':'🎲','globe_with_meridians':'🌐','infinity':'♾️','label':'🏷️','mag':'🔍','evergreen_tree':'🌲','new_moon':'🌑','sunny':'☀️','ghost':'👻','brain':'🧠','notebook':'📓','mechanic':'🧑‍🔧','atom_symbol':'⚛️','heartpulse':'💗','blue_heart':'💙','hearts':'♥️','smirk':'😏','face_palm':'🤦','grimacing':'😬','bow_and_arrow':'🏹','vhs':'📼','ladder':'🪜','pencil':'✏️','tv':'📺','paperclip':'📎','briefcase':'💼','card_index_dividers':'🗂️','musical_score':'🎼','building_construction':'🏗️','birthday':'🎂','heart_hands':'🫶','raised_hand':'✋','three_button_mouse':'🖱️','left_right_arrow':'↔️','level_slider':'🎚️','bookmark_tabs':'📑','male-technologist':'👨‍💻','magnet':'🧲','information_desk_person':'💁','butterfly':'🦋','thumbsup_all':'👍'}
ALLOWED={'a','b','em','i','pre','br','li'}
class S(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.o=[]
    def handle_starttag(s,t,a):
        a=dict(a)
        if t=='a':
            h=a.get('href','')
            if h.startswith(('http://','https://')): s.o.append(f'<a href="{html.escape(h)}" target="_blank" rel="noopener">')
            else: s.o.append('<a>')
        elif t=='tt': s.o.append('<code>')
        elif t=='li': s.o.append('<br>• ')
        elif t in ALLOWED: s.o.append(f'<{t}>')
    def handle_endtag(s,t):
        if t=='tt': s.o.append('</code>')
        elif t in ALLOWED and t not in ('br','li'): s.o.append(f'</{t}>')
    def handle_startendtag(s,t,a): s.handle_starttag(t,a)
    def handle_data(s,d): s.o.append(html.escape(d,quote=False))
def clean_html(raw):
    raw=re.sub(r'^\s*#</a>\s*','',raw)
    p=S(); p.feed(raw); h=''.join(p.o).strip()
    h=re.sub(r':([a-z0-9_+\-]+):(?::skin-tone-\d:)?',lambda m:EMOJI.get(m.group(1),m.group(0)),h)
    h=re.sub(r'^(\s*<br>)+','',h)
    # quotes: lines starting with "&gt;"
    lines=re.split(r'<br>',h); out=[];q=[]
    for ln in lines:
        if ln.lstrip().startswith('&gt;'): q.append(ln.lstrip()[4:].lstrip()); continue
        if q: out.append('<blockquote>'+'<br>'.join(q)+'</blockquote>'); q=[]
        out.append(ln)
    if q: out.append('<blockquote>'+'<br>'.join(q)+'</blockquote>')
    h='<br>'.join(out); h=re.sub(r'(<br>\s*){3,}','<br><br>',h)
    h=re.sub(r'<br>(<blockquote>)',r'\1',h); h=re.sub(r'(</blockquote>)<br>',r'\1',h)
    return h.strip()
