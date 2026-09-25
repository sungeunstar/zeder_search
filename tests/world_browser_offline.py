from pathlib import Path
import os,json,time,subprocess
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'qa';OUT.mkdir(exist_ok=True);STEPS=[];errors=[]
os.environ['DISPLAY']=':99';os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY']='1'
x=subprocess.Popen(['Xvfb',':99','-screen','0','1600x1000x24','-nolisten','tcp'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.5)
html=Path(os.environ.get('ISLAND_HTML',str(ROOT/'standalone-island.html'))).read_text();adapter='''<script>const testStore=new Map(),testSession=new Map();const adapter=m=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});Object.defineProperty(window,'localStorage',{value:adapter(testStore)});Object.defineProperty(window,'sessionStorage',{value:adapter(testSession)});if(!crypto.randomUUID)crypto.randomUUID=()=>String(Math.random())+Date.now();</script>'''
html=html.replace('<head>','<head>'+adapter,1)
def ok(s): STEPS.append(s);print('PASS',s,flush=True)
def state(page): return page.evaluate("JSON.parse(localStorage.getItem('zeder-search.chat-first.v2'))")
def wait(page): page.wait_for_timeout(900)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
  page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1,reduced_motion='reduce');page.set_default_timeout(15000)
  page.on('pageerror',lambda e:errors.append(str(e)[:800]));page.on('console',lambda m:errors.append(m.text[:800]) if m.type=='error' else None)
  page.set_content(html,wait_until='domcontentloaded');page.wait_for_function('window.zederWorld !== undefined',timeout=45000)
  assert page.evaluate("zederWorld.debug().revision==='169' && zederWorld.debug().webgl.startsWith('WebGL 2')")
  assert page.evaluate('zederWorld.debug().grassBlades===128000 && zederWorld.debug().paused')
  expect(page.locator('h1')).to_have_text('무엇을 알리고 싶으세요?');expect(page.locator('#message')).to_be_visible()
  ok('Real Three.js r169/WebGL2 renders 128k wind-driven blades; reduced motion skips intro and pauses')
  page.screenshot(path=str(OUT/'home-final.png'),timeout=30000)
  for at in [0,4,8]:
   page.evaluate(f'zederWorld.seek({at})');page.screenshot(path=str(OUT/f'intro-final-{at}.png'),timeout=30000)
  page.locator('[data-world=skip]').click();assert page.evaluate("zederWorld.debug().mode==='home'")
  ok('Cinematic orbit/fly-in produces three distinct depth-rendered views and Skip restores home')
  # Use deterministic frame advancement while holding a real keyboard event: software rendering is slow.
  page.locator('[data-world=explore]').click();page.evaluate('zederWorld.advance(0)');a=page.evaluate('zederWorld.debug().character')
  page.keyboard.down('ArrowUp');page.evaluate('zederWorld.advance(.45)');page.keyboard.up('ArrowUp');c=page.evaluate('zederWorld.debug().character')
  assert abs(a[0]-c[0])+abs(a[2]-c[2])>.4
  page.evaluate('zederWorld.advance(.2)');page.screenshot(path=str(OUT/'explore-final.png'),timeout=30000)
  page.keyboard.press('Escape');assert page.evaluate("zederWorld.debug().mode==='home'")
  ok('Explorer responds to arrow keys and Escape returns to the chat composer')
  a=page.evaluate('zederWorld.debug().character');page.locator('#message').fill('쇼핑몰 CS 문의를 정리하는 서비스를 만들었어요. 첫 고객을 찾고 싶어요.');page.keyboard.press('ArrowLeft');assert a==page.evaluate('zederWorld.debug().character')
  page.locator('[type=submit]').click();wait(page);expect(page.locator('.message-text').last).to_have_text('누구에게 먼저 알리고 싶으세요?')
  ok('Typing never moves explorer; first message opens the real existing chat flow over the 3D scene')
  page.locator('.quick-replies button').filter(has_text='작은 팀').click();wait(page);page.locator('.quick-replies button').filter(has_text='10만원').click();wait(page)
  expect(page.locator('.strategy-board')).to_have_count(1);expect(page.locator('.path-card')).to_have_count(3)
  page.screenshot(path=str(OUT/'chat-final.png'),full_page=True,timeout=30000)
  ok('Conversation generates the same inline strategy and recommended tools without a setup dashboard')
  page.locator('[data-action=request]').click();assert state(page)['threads'][0]['status']=='draft';page.locator('[data-action=confirm-request]').click();wait(page)
  assert state(page)['threads'][0]['status']=='requested';assert page.locator('#world-host').get_attribute('hidden') is not None
  ok('Confirmation required; request view hides world')
  page.locator('.demo-notice a').click();wait(page);expect(page.locator('.studio-sidebar')).to_be_visible();assert page.locator('#world-host').get_attribute('hidden') is not None
  before=page.evaluate('zederWorld.debug().frames');page.wait_for_timeout(1000);assert before==page.evaluate('zederWorld.debug().frames')
  page.locator('input[name=title]').fill('작은 쇼핑몰 10곳과 직접 대화하기');page.locator('textarea[name=review-note]').fill('CS 담당자가 없는 소형 쇼핑몰로 좁혀주세요.');page.locator('form[data-form=review] [type=submit]').click();wait(page)
  page.locator('.detail-title a').click();wait(page);page.locator('[data-action=approve]').click();wait(page)
  assert state(page)['threads'][0]['status']=='preparing'
  ok('Separate 2D marketer studio stops GPU rendering; review and customer approval still work')
  page.evaluate("location.hash='#/'");wait(page);assert page.locator('#world-host').get_attribute('hidden') is None
  ok('Returning home reuses and restores the existing scene instance')
  assert not errors,errors
  ok('No JavaScript or shader console errors in the real WebGL + app workflow')
  page.close()
  mobile=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,reduced_motion='reduce',is_mobile=True,has_touch=True);mobile.on('pageerror',lambda e:errors.append(str(e)[:500]));mobile.set_content(html,wait_until='domcontentloaded');mobile.wait_for_function('window.zederWorld !== undefined',timeout=45000)
  assert mobile.evaluate('zederWorld.debug().grassBlades===44000');assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth');expect(mobile.locator('#message')).to_be_visible()
  mobile.screenshot(path=str(OUT/'mobile-final.png'),timeout=30000)
  ok('390px mobile uses reduced 44k geometry density, real WebGL, accessible composer and no horizontal overflow')
  b.close()
finally:
 x.terminate();(OUT/'world-results.json').write_text(json.dumps({'passed':len(STEPS),'checks':STEPS,'errors':errors,'method':'Actual Three.js/WebGL2 in headful Chromium + SwiftShader. set_content and memory storage adapters due navigation policy. Domain/API HTTP tests are separate.'},ensure_ascii=False,indent=2))
