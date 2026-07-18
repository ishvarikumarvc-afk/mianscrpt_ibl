javascript:(function(){
    const S='https://script.google.com/a/macros/flipkart.com/s/AKfycbwvHPPVT0Q8WrqmNOWj0ZysnY66NaQbVYiPe-yt2uEiItgw06zjppoPQPTOYHrmMnLy/exec';
   
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
        s.innerText="  SAVING TO SHEET...";
       
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
           
            if (h.wt) h.wt = h.wt.replace(/kg/gi, "").trim();
            if (h.weight) h.weight = h.weight.replace(/kg/gi, "").trim();

            if(getPrintCount(h.bid) >= 3){
                s.style.background='#f8d7da';
                s.innerText=" DUPLICATE! Max 3 Prints allowed.";
                g.disabled=false;
                return;
            }
           
            localStorage.setItem('fk_pro_v6',JSON.stringify({casper:c,table:t}));
           
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
           
            generateSinglePrintWindow(h, qrData, c, t);
           
            s.style.background='#d4edda';
            s.innerText="  DONE!";
            setTimeout(()=>g.disabled=false,2000);
           
        } catch(e) {
            console.error(e);
            s.innerText="  ERROR";
            g.disabled=false;
        }
    }
   
    function generateSinglePrintWindow(h, data, c, t) {
        const win = window.open('', '_blank', 'width=500,height=700');
        const n = new Date().toLocaleString('en-IN',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true});
       
        let securityHTML = `<table class="t"><tr><td style="background:#eee;font-weight:bold;font-size:8px;padding:0.4mm;">FLIPKART SECURITY SLIP</td></tr><tr><td><span class="lbl">ID/STATION</span><span class="val">${c} / ${t}</span></td></tr><tr><td><span class="lbl">DATE & TIME</span><span class="val">${n}</span></td></tr><tr><td><span class="lbl">SELLER NAME</span><span class="val">${h.seller}</span></td></tr><tr><td><span class="lbl">EXTERNAL ID</span><span class="val">${h.ext}</span></td></tr><tr><td><span class="lbl">W / Q</span><span class="val">${h.wt} / ${h.qty}</span></td></tr><tr><td><span class="lbl">CONSIGNMENT ID (CID)</span><span class="val" style="font-size:11px">${h.cid}</span></td></tr><tr><td><span class="lbl">BOX IDENTITY (BID)</span><span class="val" style="font-size:11px">${h.bid}</span></td></tr></table>`;
       
        let itemsListHtml = '<div class="text-container">';
        itemsListHtml += '<div class="text-header-box">';
        itemsListHtml += '<div>BOX ID: ' + h.bid + '</div>';
        itemsListHtml += '<div>EXT ID: ' + h.extId + '</div>';
        itemsListHtml += '</div>';
        itemsListHtml += '<div class="text-title">FSN, WID & QTY LIST</div>';
       
        Object.keys(data).forEach(function(key) {
            let widVal = data[key] ? data[key] : '-';
            let fsnVal = key.replace(/FSN:\s*/i, "").replace(/\s*QTY:\s*\d+/i, "").trim();
            let qtyVal = "";
            let qtyMatch = key.match(/QTY:\s*(\d+)/i);
            if(qtyMatch) {
                qtyVal = qtyMatch[1];
            }
            itemsListHtml += '<div class="text-item"><span class="text-left">' + fsnVal + ', ' + widVal + ' ' + qtyVal + '</span></div>';
        });
        itemsListHtml += '</div>';
       
        const combinedHtml = `
        <html>
        <head>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
                @page { size: 3in 3in; margin: 0; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; width: 3in; overflow: hidden; }
               
                .page-item {
                    width: 3in;
                    height: 3in;
                    page-break-after: always;
                    box-sizing: border-box;
                    overflow: hidden;
                }
               
                .security-pt {
                    padding-top: 2mm;
                }
                .t {
                    width: 2.85in;
                    border-collapse: collapse;
                    margin: 0 auto;
                    border: 0.8px solid #000;
                    height: 1.15in;
                }
                .t td {
                    border: 0.8px solid #000;
                    padding: 0.8mm;
                    text-align: center;
                    vertical-align: middle;
                }
                .lbl {
                    font-size: 6.5px;
                    font-weight: bold;
                    color: #444;
                    text-transform: uppercase;
                    margin-bottom: 0.1mm;
                    display: block;
                }
                .val {
                    font-size: 9.5px;
                    font-weight: 900;
                    text-transform: uppercase;
                    display: block;
                }
               
                .main-layout {
                    border: 1px solid #000;
                    margin: 1mm;
                    height: 2.8in;
                    display: flex;
                    box-sizing: border-box;
                    position: relative;
                }
                
                /* लेफ्ट साइड कॉलम */
                .bc-left-col {
                    width: 0.35in;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center; 
                    align-items: center;
                    position: relative;
                    overflow: hidden;
                    margin-left: 2mm; 
                }
                
                /* लेफ्ट साइड कंसाइनमेंट नंबर फिक्स पोजीशन में */
                .cid-side-text {
                    transform: rotate(-90deg);
                    white-space: nowrap;
                    font-size: 14px;
                    font-weight: 900;
                    text-transform: uppercase;
                    position: absolute;
                    top: 8mm; 
                }
                
                /* बारकोड रोटेटर - इसमें margin-top देकर बारकोड को थोड़ा सा नीचे खिसका दिया */
                .cbc-rotator {
                    transform: rotate(-90deg);
                    transform-origin: center;
                    white-space: nowrap;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: 22px; 
                }

                .bc-right-col {
                    width: 1.15in;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    overflow: hidden;
                    padding-right: 2.5mm; 
                    margin-right: 1mm;
                }
                
                .rotator {
                    transform: rotate(-90deg);
                    transform-origin: center;
                    white-space: nowrap;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .center-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    box-sizing: border-box;
                    border-left: 0.5px dashed #999;
                    border-right: 0.5px dashed #999;
                    overflow: hidden;
                    margin-left: 1mm;
                    position: relative;
                }

                .info-text-rotator {
                    transform: rotate(-90deg);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 180px; 
                    position: absolute;
                    top: 23mm;
                    text-align: center;
                }

                .seller-name {
                    font-weight: bold;
                    font-size: 9.5px;
                    text-transform: uppercase;
                    margin-bottom: 3px;
                    width: 100%;
                    word-wrap: break-word;
                }
                
                .address-block {
                    font-weight: bold;
                    font-size: 7px;
                    text-transform: uppercase;
                    width: 100%;
                    line-height: 1.1;
                    display: block;
                    margin-bottom: 4px;
                    word-wrap: break-word;
                    white-space: normal;
                }
                
                .ext-weight-box {
                    font-size: 8px;
                    font-weight: bold;
                    margin-top: 1px;
                    width: 100%;
                    line-height: 1.1;
                    margin-bottom: 2px;
                    word-wrap: break-word;
                }

                .box-id-under {
                    font-size: 9px;
                    font-weight: 900;
                    margin-top: 2px;
                    width: 100%;
                    word-wrap: break-word;
                    text-transform: uppercase;
                }

                .footer-box {
                    width: 100%;
                    border-top: 0.8px dashed #000;
                    position: absolute;
                    bottom: 0.5mm;
                    left: 0;
                    padding-top: 0.5mm;
                    text-align: center;
                    font-size: 6px;
                    font-weight: bold;
                    background: white;
                }
               
                .text-container {
                    width: 3in;
                    height: 3in;
                    box-sizing: border-box;
                    padding: 1.5mm 2mm;
                    font-size: 9.5px;
                    line-height: 1.2;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .text-header-box {
                    font-size: 8.5px;
                    font-weight: bold;
                    border: 1px solid #000;
                    padding: 0.8mm;
                    margin-bottom: 1.2mm;
                    text-align: center;
                    background-color: #f9f9f9;
                }
                .text-title {
                    font-weight: bold;
                    font-size: 9.5px;
                    border-bottom: 1px solid #000;
                    text-align: center;
                    margin-bottom: 1.2mm;
                    padding-bottom: 0.2mm;
                    text-transform: uppercase;
                }
                .text-item {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 0.6mm 0;
                    border-bottom: 0.5px solid #ccc;
                }
                .text-left {
                    word-break: break-all;
                    font-weight: bold;
                    text-align: center;
                    font-size: 8.5px;
                    width: 100%;
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
            <div class="page-item security-pt">
                ${securityHTML}
            </div>
           
            <div class="page-item security-pt">
                ${securityHTML}
            </div>
           
            <div class="page-item">
                <div class="main-layout">
                    <!-- लेफ्ट साइड कॉलम -->
                    <div class="bc-left-col">
                        <div class="cid-side-text">${h.cid}</div>
                        <div class="cbc-rotator">
                            <svg id="cbc"></svg>
                        </div>
                    </div>
                    
                    <!-- बीच का डिटेल्स एरिया -->
                    <div class="center-content">
                        <div class="info-text-rotator">
                            <div class="seller-name">${h.seller}</div>
                            <div class="address-block">${h.address}</div>
                            <div class="ext-weight-box">EXT: ${h.extId}</div>
                            <div class="ext-weight-box">W: ${h.weight} | Q: ${h.qty}</div>
                            <div class="box-id-under">${h.bid}</div>
                        </div>
                    </div>
                    
                    <!-- राइट साइड कॉलम -->
                    <div class="bc-right-col">
                        <div class="rotator">
                            <svg id="bbc"></svg>
                        </div>
                    </div>

                    <!-- फुटर -->
                    <div class="footer-box">
                        ID: ${c}/${t} | DT: ${n}
                    </div>
                </div>
            </div>
           
            ${itemsListHtml}
           
            <script>
                try {
                    JsBarcode("#cbc","${h.cid}",{format:"CODE128",width:1.55,height:48,displayValue:false,margin:0,quietZone:6});
                    JsBarcode("#bbc","${h.bid}",{format:"CODE128",width:1.55,height:48,displayValue:false,margin:0,quietZone:6});
                    
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

