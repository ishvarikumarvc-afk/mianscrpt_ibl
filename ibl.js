javascript:(function(){
    var script = document.createElement('script');    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    document.head.appendChild(script);
    script.onload = async function() {
        try {            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            const pdfUrl = window.location.href;
            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;
            let qrData = {};
            let h = { seller: "", address: "", extId: "", cid: "", bid: "", qty: "", weight: "" };
            let page1Items = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const items = content.items.map(it => it.str.trim()).filter(s => s !== "");
                if (i === 1) page1Items = items;
                if (i === 2) {
                    items.forEach((txt, idx) => {
                        let t = txt.toLowerCase();
                        if(t.includes("seller")) h.seller = items[idx+1] || "";
                        if(t.includes("external")) h.extId = items[idx+1] || "";
                        if(t.includes("consignment")) h.cid = items[idx+1] || "";
                        if(t.includes("box id")) h.bid = items[idx+1] || "";
                        if(t.includes("weight")) h.weight = items[idx+1] || "";
                        if(t.includes("total quantity")) h.qty = items[idx+1] || "";
                    });
                    h.cid = h.cid.replace(/\D/g, "");
                    h.bid = (h.bid.split(" ")[0] || "").replace(/[^A-Z0-9]/gi, "");
                }
                items.forEach((txt, idx) => {
                    if (txt.includes("FSN:") || (txt.length === 16 && /^[A-Z0-9]+$/.test(txt))) {
                        let wid = txt.replace("FSN:", "").trim();
                        if(!wid) wid = items[idx+1];
                        
                        let currentWidValue = "";
                        for (let m = 1; m <= 15; m++) {
                            let testVal = items[idx+m];
                            if (testVal && testVal.toUpperCase().includes("WID")) {
                                currentWidValue = testVal.replace(/WID:?/i, "").trim();
                                if (!currentWidValue && items[idx+m+1]) {
                                    currentWidValue = items[idx+m+1].trim();
                                }
                                break;
                            }
                        }

                        for (let k = 1; k <= 15; k++) {
                            let val = items[idx+k];
                            if (val && /^\d+$/.test(val) && parseInt(val) < 500) {
                                qrData["FSN:" + wid + " QTY: " + parseInt(val)] = currentWidValue || "";
                                break;
                            }
                        }
                    }
                });
            }
            if (h.seller && page1Items.length > 0) {
                let sellerIdx = page1Items.findIndex(t => t.toLowerCase().includes(h.seller.toLowerCase()));
                if (sellerIdx !== -1) {
                    let addrArr = [];
                    let foundPin = "";
                    
                    for (let j = sellerIdx + 1; j < page1Items.length; j++) {
                        let tempLine = page1Items[j].trim();
                        let lowerLine = tempLine.toLowerCase();

                        let pinMatch = tempLine.match(/\b\d{6}\b/);
                        if (pinMatch) {
                            foundPin = pinMatch[0];
                        }

                        if (tempLine.includes("Phone:") || tempLine.includes("GSTIN") || addrArr.length > 12) {
                            break;
                        }
                        
                        if (lowerLine.includes("tracking id:") || lowerLine.includes("box id:") || lowerLine.includes("consignment id:")) {
                            tempLine = tempLine.replace(/TRACKING ID:.*?CONSIGNMENT ID:\s*\S*/i, "").trim();
                            tempLine = tempLine.replace(/^\d+\s*/, "").trim();
                        }
                        
                        if (lowerLine.includes("ext id:") || lowerLine.includes("wt:") || lowerLine.includes("qty:")) {
                            break;
                        }

                        if (tempLine !== "") {
                            addrArr.push(tempLine);
                        }
                    }
                    
                    let finalAddressStr = addrArr.join(" ");
                    if (foundPin && !finalAddressStr.includes(foundPin)) {
                        finalAddressStr += " " + foundPin;
                    }
                    
                    h.address = finalAddressStr;
                }
            }
            if (!h.address) h.address = page1Items.slice(1, 8).join(" ");
            
            h.address = h.address.replace(/TRACKING ID:.*?CONSIGNMENT ID:\s*\S*/gi, "").trim();
            
            showFinalLabel(h, qrData);
        } catch (e) { console.error(e); alert("Error processing PDF."); }
    };

    function showFinalLabel(h, data) {
        const win = window.open('', '_blank', 'width=450,height=600');        
        let cleanText = Object.keys(data).join(", ");
        
        let itemsListHtml = '<div class="text-container"><div class="text-title">FSN & QTY LIST</div>';
        Object.keys(data).forEach(function(item) {
            let widVal = data[item] ? data[item] : '-';
            itemsListHtml += '<div class="text-item"><span class="text-left">' + item + '</span><span class="text-right">' + widVal + '</span></div>';
        });
        itemsListHtml += '</div>';
        
        const html = '<html><head><script src="https://cdn.jsdelivr.net/npm/qrcode_js@1.0.0/qrcode.min.js"></script><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script><style>@page{size:60mm 110mm;margin:0}body{font-family:Arial;width:60mm;margin:0;padding:0}.container{border:1px solid #000;margin:1mm;padding:2mm;display:flex;flex-direction:column;align-items:center}.info-box{width:100%;font-size:9px;border-bottom:1.5px solid #000;padding-bottom:2mm;margin-bottom:2mm;line-height:1.2}.seller-name{font-weight:bold;font-size:10px;text-transform:uppercase;margin-bottom:2px;display:block}.address-block{font-weight:normal;text-transform:uppercase;word-wrap:break-word}.ext-weight-box{font-size:11px;font-weight:bold;margin-top:2px}.bc-row{width:100%;text-align:center;margin-bottom:3mm}.val-txt{font-size:12px;font-weight:bold}#qrcode{margin-bottom:3mm; display:flex; justify-content:center;}svg{width:100%;height:30px}/* Centered & Grid Aligned Next Page Layout */.text-container{page-break-before:always;width:60mm;box-sizing:border-box;padding:1mm 2mm;font-size:8px;line-height:1.1}.text-title{font-weight:bold;font-size:9px;border-bottom:1px solid #000;text-align:center;margin-bottom:1mm;padding-bottom:0.5mm}.text-item{display:grid;grid-template-columns:3.2fr 1fr;align-items:center;padding:0.5mm 0;border-bottom:0.2px solid #ddd}.text-left{word-break:break-all;font-weight:bold;text-align:left;font-size:7.5px;padding-left:0.5mm}.text-right{word-break:break-all;text-align:left;font-weight:normal;color:#333;font-size:7.5px;padding-left:2mm}</style></head><body><div class="container"><div id="qrcode"></div><div class="info-box"><div class="seller-name">'+h.seller+'</div><div class="address-block">'+h.address+'</div><div class="ext-weight-box">Ext ID: '+h.extId+'</div><div class="ext-weight-box">Wt: '+h.weight+' | Qty: '+h.qty+'</div></div><div class="bc-row"><div class="val-txt">'+h.cid+'</div><svg id="cbc"></svg></div><div class="bc-row"><div class="val-txt">'+h.bid+'</div><svg id="bbc"></svg></div></div>'+itemsListHtml+'<script>try{JsBarcode("#cbc","'+h.cid+'",{format:"CODE128",height:30,displayValue:false,margin:0});JsBarcode("#bbc","'+h.bid+'",{format:"CODE128",height:30,displayValue:false,margin:0});new QRCode(document.getElementById("qrcode"),{text:'+JSON.stringify(cleanText)+',width:140,height:140});setTimeout(function(){window.print();window.close();},1200);}catch(e){}</script></body></html>';
        win.document.write(html);
        win.document.close();
    }
})();
