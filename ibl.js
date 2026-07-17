javascript:(function(){
    const S='https://script.google.com/a/macros/flipkart.com/s/AKfycbwvHPPVT0Q8WrqmNOWj0ZysnY66NaQbVYiPe-yt2uEiItgw06zjppoPQPTOYHrmMnLy/exec';
   
    // 3 बार प्रिंट करने की अनुमति देने वाला लॉजिक
    function getPrintCount(b) {
        let h = JSON.parse(localStorage.getItem('fk_h5k_counts') || "{}");
        return h[b] || 0;
    }
   
    function increasePrintCount(b) {
        let h = JSON.parse(localStorage.getItem('fk_h5k_counts') || "{}");
        h[b] = (h[b] || 0) + 1;
        if (Object.keys(h).length > 2000) {
            delete h[Object.keys(h)[0]];
        }
        localStorage.setItem('fk_h5k_counts', JSON.stringify(h));
    }
   
    function show(a){
        if(document.getElementById('fk-app')) return;
        const u=document.createElement('div');
        u.id='fk-app';
        u.style='position:fixed;top:20px;right:20px;width:340px;background:white;z-index:999999;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:sans-serif;border:1px solid #2874f0;overflow:hidden;';
        u.innerHTML=`<div style="background:linear-gradient(135deg,#2874f0,#004ba0);color:#fff;padding:20px;text-align:center;"><div style="font-size:18px;font-weight:800;letter-spacing:1px;">LABEL PRO MAX</div></div><div style="padding:25px;"><label style="font-size:11px;font-weight:bold;color:#666;">CASPER ID</label><input id="f-c" value="${a.casper||''}" style="width:100%;padding:12px;margin-bottom:15px;border:1.5px solid #ddd;border-radius:10px;box-sizing:border-box;"><label style="font-size:11px;font-weight:bold;color:#666;">STATION</label><input id="f-t" value="${a.table||''}" style="width:100%;padding:12px;margin-bottom:20px;border:1.5px solid #ddd;border-radius:10px;box-sizing:border-box;"><div id="f-s" style="display:none;padding:12px;border-radius:10px;font-size:12px;margin-bottom:20px;text-align:center;font-weight:bold;"></div><button id="f-g" style="width:100%;padding:15px;background:#fb641b;color:#fff;border:none;border-radius:12px;font-weight:bold;cursor:pointer;">GENERATE & SAVE TO SHEET</button></div>`;
        document.body.appendChild(u);
        document.getElementById('f-g').onclick=()=>proc(a);
    }
   
    async function proc(a){
        const g=document.getElementById('f-g'),
              s=document.getElementById('f-s'),
              c=document.getElementById('f-c').value,
              t=document.getElementById('f-t').value;
             
        if(!c||!t) return alert("Empty!");
        g.disabled=true;
        s.style.display='block';
        s.style.background='#e3f2fd';
        s.innerText=" 🔍 SAVING TO SHEET...";
       
        try{
            if(typeof pdfjsLib==='undefined'){
                const sc=document.createElement('script');
                sc.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
                document.head.appendChild(sc);
                await new Promise(r=>sc.onload=r);
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
           
            const pdf=await pdfjsLib.getDocument(window.location.href).promise;
            let qrData={};
            let h={seller:'',address:'',extId:'',ext:'',cid:'',bid:'',qty:'',weight:'',wt:''};
            let page1Items=[];
           
            for (let i=1; i<=pdf.numPages; i++) {
                const page=await pdf.getPage(i);
                const content=await page.getTextContent();
                const items=content.items.map(it=>it.str.trim()).filter(x=>x!='');
                if (i===1) page1Items=items;
                if (i===2) {
                    items.forEach((txt,idx)=>{
                        let l=txt.toLowerCase();
                        if(l.includes('seller')) h.seller=items[idx+1]||"";
                        if(l.includes('external')) { h.extId=items[idx+1]||""; h.ext=h.extId; }
                        if(l.includes('consignment')) h.cid=items[idx+1]||"";
                        if(l.includes('box id')) h.bid=items[idx+1]||"";
                        if(l.includes('weight')) { h.weight=items[idx+1]||""; h.wt=h.weight; }
                        if(l.includes('total quantity')) h.qty=items[idx+1]||"";
                    });
                    h.cid=h.cid.replace(/\D/g,"");
                    h.bid=(h.bid.split(" ")[0]||"").replace(/[^A-Z0-9]/gi,"");
                }
                items.forEach((txt,idx)=>{
                    if (txt.includes("FSN:")||(txt.length===16&&/^[A-Z0-9]+$/.test(txt))) {
                        let wid=txt.replace("FSN:","").trim();
                        if(!wid) wid=items[idx+1];
                       
                        let currentWidValue="";
                        for (let m=1; m<=15; m++) {
                            let testVal=items[idx+m];
                            if (testVal&&testVal.toUpperCase().includes("WID")) {
                                currentWidValue=testVal.replace(/WID:?/i,"").trim();
                                if(!currentWidValue&&items[idx+m+1]) {
                                    currentWidValue=items[idx+m+1].trim();
                                }
                                break;
                            }
                        }
                        for (let k=1; k<=15; k++) {
                            let val=items[idx+k];
                            if (val&&/^\d+$/.test(val)&&parseInt(val)<500) {
                                qrData["FSN:"+wid+" QTY: "+parseInt(val)]=currentWidValue||"";
                                break;
                            }
                        }
                    }
                });
            }
           
            if (h.seller&&page1Items.length>0) {
                let sellerIdx=page1Items.findIndex(t=>t.toLowerCase().includes(h.seller.toLowerCase()));
                if (sellerIdx!==-1) {
                    let addrArr=[];
                    let foundPin="";
                    for (let j=sellerIdx+1; j<page1Items.length; j++) {
                        let tempLine=page1Items[j].trim();
                        let lowerLine=tempLine.toLowerCase();
                        let pinMatch=tempLine.match(/\b\d{6}\b/);
                        if (pinMatch) foundPin=pinMatch[0];
                        if (tempLine.includes("Phone:")||tempLine.includes("GSTIN")||addrArr.length>12) break;
                        if (lowerLine.includes("tracking id:")||lowerLine.includes("box id:")||lowerLine.includes("consignment id:")) {
                            tempLine=tempLine.replace(/TRACKING ID:.*?CONSIGNMENT ID:\s*\S*/i,"").trim();
                            tempLine=tempLine.replace(/^\d+\s*/,"").trim();
                        }
                        if (lowerLine.includes("ext id:")||lowerLine.includes("wt:")||lowerLine.includes("qty:")) break;
                        if (tempLine!=="") addrArr.push(tempLine);
                    }
                    let finalAddressStr=addrArr.join(" ");
                    if (foundPin&&!finalAddressStr.includes(foundPin)) finalAddressStr+=" "+foundPin;
                    h.address=finalAddressStr;
                }
            }
            if (!h.address) h.address=page1Items.slice(1,8).join(" ");
            h.address=h.address.replace(/TRACKING ID:.*?CONSIGNMENT ID:\s*\S*/gi,"").trim();
           
            // 3 बार से ज़्यादा प्रिंट होने पर ही डुप्लीकेट एरर दिखाएगा
            if(getPrintCount(h.bid) >= 3){
                s.style.background='#f8d7da';
                s.innerText="⚠️ DUPLICATE! Max 3 Prints allowed.";
                g.disabled=false;
                return;
            }
           
            localStorage.setItem('fk_pro_v6',JSON.stringify({casper:c,table:t}));
           
            /* SAVE TO SHEET LOGIC */
            const f=document.createElement('form');
            f.method='POST';
            f.action=S;
            f.target='hf';
            const i=document.createElement('input');
            i.name='payload';
            i.value=JSON.stringify({seller:h.seller,ext:h.ext,cid:h.cid,bid:h.bid,qty:h.qty,wt:h.wt,casper:c,table:t});
            f.appendChild(i);
            const ifr=document.createElement('iframe');
            ifr.name='hf';
            ifr.style.display='none';
            document.body.appendChild(ifr);
            document.body.appendChild(f);
            f.submit();
           
            increasePrintCount(h.bid);
           
            // सभी स्लिप्स को 3in x 3in के पेपर साइज़ में जेनरेट करना
            generateSinglePrintWindow(h, qrData, c, t);
           
            s.style.background='#d4edda';
            s.innerText=" ✅ DONE!";
            setTimeout(()=>g.disabled=false,2000);
           
        } catch(e) {
            console.error(e);
            s.innerText=" ❌ ERROR";
            g.disabled=false;
        }
    }
   
    function generateSinglePrintWindow(h, data, c, t) {
        const win = window.open('', '_blank', 'width=500,height=700');
        const n = new Date().toLocaleString('en-IN',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true});
        let cleanText = Object.keys(data).join(", ");
       
        // सुरक्षा पर्चियां (Two Security Slips)
        let securityHTML = `<table class="t"><tr><td style="background:#eee;font-weight:bold;font-size:8.5px;padding:0.6mm;">FLIPKART SECURITY SLIP</td></tr><tr><td><span class="lbl">ID/STATION</span><span class="val">${c} / ${t}</span></td></tr><tr><td><span class="lbl">DATE & TIME</span><span class="val">${n}</span></td></tr><tr><td><span class="lbl">SELLER NAME</span><span class="val">${h.seller}</span></td></tr><tr><td><span class="lbl">EXTERNAL ID</span><span class="val">${h.ext}</span></td></tr><tr><td><span class="lbl">WEIGHT / QTY</span><span class="val">${h.wt} / ${h.qty}</span></td></tr><tr><td><span class="lbl">CONSIGNMENT ID (CID)</span><span class="val" style="font-size:11.5px">${h.cid}</span></td></tr><tr><td><span class="lbl">BOX IDENTITY (BID)</span><span class="val" style="font-size:11.5px">${h.bid}</span></td></tr></table>`;
       
        // FSN & QTY की कॉम्पैक्ट लिस्ट
        let itemsListHtml = '<div class="text-container">';
        itemsListHtml += '<div class="text-header-box">';
        itemsListHtml += '<div>BOX ID: ' + h.bid + '</div>';
        itemsListHtml += '<div>EXT ID: ' + h.extId + '</div>';
        itemsListHtml += '</div>';
        itemsListHtml += '<div class="text-title">FSN & QTY LIST</div>';
       
        Object.keys(data).forEach(function(item) {
            let widVal = data[item] ? data[item] : '-';
            itemsListHtml += '<div class="text-item"><span class="text-left">' + item + '</span><span class="text-right">' + widVal + '</span></div>';
        });
        itemsListHtml += '</div>';
       
        const combinedHtml = `
        <html>
        <head>
            <script src="https://cdn.jsdelivr.net/npm/qrcode_js@1.0.0/qrcode.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
                @page { size: 3in 3in; margin: 0; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; width: 3in; overflow: hidden; }
               
                /* All Pages Size set to strictly 3in x 3in */
                .page-item {
                    width: 3in;
                    height: 3in;
                    page-break-after: always;
                    box-sizing: border-box;
                    overflow: hidden;
                }
               
                /* Security Slips Styles */
                .security-pt {
                    padding-top: 4mm;
                }
                .t {
                    width: 2.9in;
                    border-collapse: collapse;
                    margin: 0 auto;
                    border: 0.8px solid #000;
                    height: 1.2in;
                }
                .t td {
                    border: 0.8px solid #000;
                    padding: 1.2mm;
                    text-align: center;
                    vertical-align: middle;
                }
                .lbl {
                    font-size: 7px;
                    font-weight: bold;
                    color: #444;
                    text-transform: uppercase;
                    margin-bottom: 0.2mm;
                    display: block;
                }
                .val {
                    font-size: 10.5px;
                    font-weight: 900;
                    text-transform: uppercase;
                    display: block;
                }
               
                /* Main Label Styles */
                .container {
                    border: 1px solid #000;
                    margin: 1mm;
                    padding: 1.5mm;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .info-box {
                    width: 100%;
                    font-size: 8px;
                    border-bottom: 1.2px solid #000;
                    padding-bottom: 1mm;
                    margin-bottom: 1mm;
                    line-height: 1.1;
                }
                .seller-name {
                    font-weight: bold;
                    font-size: 9px;
                    text-transform: uppercase;
                    margin-bottom: 1px;
                    display: block;
                }
                .address-block {
                    font-weight: normal;
                    text-transform: uppercase;
                    word-wrap: break-word;
                }
                .ext-weight-box {
                    font-size: 9.5px;
                    font-weight: bold;
                    margin-top: 1px;
                }
                .bc-row {
                    width: 100%;
                    text-align: center;
                    margin-bottom: 1.5mm;
                }
                .val-txt {
                    font-size: 10px;
                    font-weight: bold;
                }
                #qrcode {
                    margin-bottom: 1.5mm;
                    display: flex;
                    justify-content: center;
                }
                svg {
                    width: 100%;
                    height: 22px;
                }
               
                /* FSN & QTY List Styles (2X Size inside 3in x 3in) */
                .text-container {
                    width: 3in;
                    height: 3in;
                    box-sizing: border-box;
                    padding: 2mm 3mm;
                    font-size: 14px;
                    line-height: 1.2;
                    overflow: hidden;
                }
                .text-header-box {
                    font-size: 13px;
                    font-weight: bold;
                    border: 1.2px solid #000;
                    padding: 1mm;
                    margin-bottom: 1.5mm;
                    text-align: left;
                    background-color: #f9f9f9;
                }
                .text-title {
                    font-weight: bold;
                    font-size: 14px;
                    border-bottom: 1.2px solid #000;
                    text-align: center;
                    margin-bottom: 1.5mm;
                    padding-bottom: 0.5mm;
                    text-transform: uppercase;
                }
                .text-item {
                    display: grid;
                    grid-template-columns: 3.2fr 1fr;
                    align-items: center;
                    padding: 0.8mm 0;
                    border-bottom: 0.5px solid #ddd;
                }
                .text-left {
                    word-break: break-all;
                    font-weight: bold;
                    text-align: left;
                    font-size: 12px;
                    padding-left: 0.5mm;
                }
                .text-right {
                    word-break: break-all;
                    text-align: left;
                    font-weight: normal;
                    color: #333;
                    font-size: 12px;
                    padding-left: 2mm;
                }
               
                @media print {
                    .page-item {
                        width: 3in;
                        height: 3in;
                        page-break-after: always;
                    }
                    .text-container {
                        width: 3in;
                        height: 3in;
                        page-break-before: always;
                    }
                }
            </style>
        </head>
        <body>
            <!-- Security Slip 1 -->
            <div class="page-item security-pt">
                ${securityHTML}
            </div>
           
            <!-- Security Slip 2 -->
            <div class="page-item security-pt">
                ${securityHTML}
            </div>
           
            <!-- Main Label Page -->
            <div class="page-item">
                <div class="container">
                    <div id="qrcode"></div>
                    <div class="info-box">
                        <div class="seller-name">${h.seller}</div>
                        <div class="address-block">${h.address}</div>
                        <div class="ext-weight-box">Ext ID: ${h.extId}</div>
                        <div class="ext-weight-box">Wt: ${h.weight} | Qty: ${h.qty}</div>
                    </div>
                    <div class="bc-row">
                        <div class="val-txt">${h.cid}</div>
                        <svg id="cbc"></svg>
                    </div>
                    <div class="bc-row">
                        <div class="val-txt">${h.bid}</div>
                        <svg id="bbc"></svg>
                    </div>
                </div>
            </div>
           
            <!-- FSN & QTY List Page -->
            ${itemsListHtml}
           
            <script>
                try {
                    JsBarcode("#cbc","${h.cid}",{format:"CODE128",height:22,displayValue:false,margin:0});
                    JsBarcode("#bbc","${h.bid}",{format:"CODE128",height:22,displayValue:false,margin:0});
                    new QRCode(document.getElementById("qrcode"),{text:${JSON.stringify(cleanText)},width:110,height:110});
                    setTimeout(function(){
                        window.print();
                        window.close();
                    }, 1400);
                } catch(e) {}
            </script>
        </body>
        </html>`;
       
        win.document.write(combinedHtml);
        win.document.close();
    }
   
    const sv=localStorage.getItem('fk_pro_v6');
    show(sv?JSON.parse(sv):{});
})();
