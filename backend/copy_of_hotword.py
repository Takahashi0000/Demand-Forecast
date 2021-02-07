############################################
#
#2021_02_07 統合し、全て機能するようにした。
#@飯島
#
#必要ライブラリ...firebase_admin,selenium,chromedriver_binary,BeautifulSoup,pytrends,smtplib
##############################################
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
#############################################
'''
from time import sleep                           
from selenium import webdriver     
import chromedriver_binary
from bs4 import BeautifulSoup
import numpy
'''
from google.colab import auth
from oauth2client.client import GoogleCredentials
from selenium import webdriver
from bs4 import BeautifulSoup
from time import sleep 
import numpy
#############################################
from pytrends.request import TrendReq
#############################################
import smtplib
from email.mime.text import MIMEText
from email.utils import formatdate

#############################################
def send_datebase(name,state):
    data = {
        u'name': name,
        u'state': state,
    }
    db = firestore.client()
    docs = db.collection(u'item').document(name).set(data)

def send_datetime(state):
    data = {
        u'timestamp': state,
    }
    db = firestore.client()
    docs = db.collection(u'timespan').document(u'span').set(data)

def read_datebase():
    db = firestore.client()
    docs = db.collection('users').get()
    i=0
    email=[]
    product=[]
    for doc in docs:
        email.append(doc.to_dict()["email"])
        product.append(doc.to_dict()["product"])
    return email,product

def send_mail(mailaddr,key_word):
    #mailaddr='noah.rio1102@gmail.com'
    #mailaddr_sakai='hhidas587@gmail.com'
    #mailaddr_taka='tetsuya.takahashi200@gmail.com'

    comment=str(mailaddr)+'さん、こんにちは、DemandForecastです。\n昨日段階であなたの登録した\n'+str(key_word)+'\nが今SNS上で話題になっています。\n現在非常時の場合は在庫切れの可能性もございますので\n衝撃に備えてください。\n今後ともDemandForecastをよろしくお願いいたします。'
    smtpobj=smtplib.SMTP('smtp.gmail.com',587)
    smtpobj.ehlo()
    smtpobj.starttls()
    smtpobj.ehlo()
    smtpobj.login("demandforecast.fuzi@gmail.com","DemandFuzi")

    msg =MIMEText(comment)
    msg['Subject']='DemandForecast'
    msg['From']='demandforecast.fuzi@gmail.com'
    msg['To']=mailaddr
    msg['Date']=formatdate()
    smtpobj.sendmail('demandforecast.fuzi@gmail.com',mailaddr,msg.as_string())
    smtpobj.close()
####################################################

def main():
    cred = credentials.Certificate("demand-forecast-by-hw-firebase-adminsdk-zbrw8-240f7687b3.json") # ダウンロードした秘密鍵
    ############################################################################################################################
    firebase_admin.initialize_app(cred)#認証するためのやつ、これは一回やったらシャープで無効にしてください。ローカルの場合では大丈夫
    ############################################################################################################################
    #おまじない#######################################
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    driver = webdriver.Chrome('chromedriver',options=options)
    driver.implicitly_wait(10)
    ################################################

    ratios= []

    ############################################################
    #nify
    name = "http://search.nifty.com/shun/ranking.htm"
    driver.get(name)
    driver.implicitly_wait(10)
    html= driver.page_source.encode('utf-8')
    soup = BeautifulSoup(html,"html.parser")
    all_Ratio=soup.find_all("dd",class_="title")
    for ul_tag in all_Ratio:
        for span in ul_tag.find_all('a'):
            ratios.append(span.get_text())

    for i in range(5):
        name = "http://search.nifty.com/shun/ranking"+str(i+1)+".htm"
        driver.get(name)
        driver.implicitly_wait(10)
        html= driver.page_source.encode('utf-8')
        soup = BeautifulSoup(html,"html.parser")
        all_Ratio=soup.find_all("dd",class_="title")
        for ul_tag in all_Ratio:
            for span in ul_tag.find_all('a'):
                ratios.append(span.get_text())
    ###########################################################
    #d_menu
    name = "https://search.smt.docomo.ne.jp/result"
    driver.get(name)
    driver.implicitly_wait(10)
    html= driver.page_source.encode('utf-8')
    soup = BeautifulSoup(html,"html.parser")
    all_Ratio=soup.find_all("div",class_="swiper-slide")
    for ul_tag in all_Ratio:
        for span in ul_tag.find_all('a'):
            ratios.append(span.get_text())
    ###########################################################
    #twitter
    name = "https://tr.twipple.jp/hotword/today.html"
    driver.get(name)
    driver.implicitly_wait(10)
    html= driver.page_source.encode('utf-8')
    soup = BeautifulSoup(html,"html.parser")
    all_Ratio=soup.find_all("div",class_="rankTtl")
    for ul_tag in all_Ratio:
        for span in ul_tag.find_all('a'):
            ratios.append(span.get_text())
    ###########################################################
    driver.close
    
    email,product = read_datebase()
    for index, word_list in enumerate(product,start=0):
        ###############################################################
        pytrends = TrendReq(hl='en-US', tz=360)
        google_maillist=[]
        
        for word in word_list:
            # API
            kw_list = [word]
            print(kw_list)
            pytrends.build_payload(kw_list, cat=0, timeframe='today 1-m', geo='JP', gprop='')#1, 7 days or 1, 3, 12 months only
            df=pytrends.interest_over_time()#datebase作成
            list_date =df.index.to_list()#日付のリスト化
            list_sample=[]
            dff=df.diff(1);
            list_sample = dff[str(word)].to_list()
            a=list_sample[-1:]
            if float(*a)>=40:
                google_maillist.append(word)
            
            send_datebase(str(word),list_sample[1:])
        state=[list_date[1],*list_date[-1:]]
        send_datetime(state)
        ###########################################################
        mail_word=[]
        for word in word_list:
            for ratio in ratios:
                if word in ratio:
                    mail_word.append(word)
        mail_word+=google_maillist
        mail=numpy.unique(mail_word).tolist()
        print(str(email[index])+":"+str(mail))
        if (str(mail) != str("[]")):
            send_mail(str(email[index]),str(mail))

if __name__ == "__main__":
    main()
