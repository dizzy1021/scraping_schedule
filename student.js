const request = require("request");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

const NIM_SELECTOR = "#TxtUid";
const PASS_SELECTOR = "#TxtPwd";
const LOGIN_SELECTOR = "#BtnLogin";

exports.loginStudent = (req, res) => {
  let nim = req.body.nim;
  let pass = req.body.password;

  (async () => {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox'"]
    });
    const page = await browser.newPage();
    page.setViewport({ width: 1366, height: 768 });
    await page.goto("http://akademik.uhamka.ac.id/");
    await page.click(NIM_SELECTOR);
    await page.keyboard.type(nim);
    await page.click(PASS_SELECTOR);
    await page.keyboard.type(pass);
    await page.click(LOGIN_SELECTOR);
    await page.waitForNavigation();

    const cookies = await page.cookies();

    let cookies_value = cookies[0].value;

    browser.close();
    return cookies_value;
  })()
    .then(cookie => {
      generateJadwal(cookie.replace(/\s/g, ""), res);
    })
    .catch(err => {
      res.status(404).json({
        status: "error",
        message: err + " ERROR"
      });
    });
};

function generateJadwal(cookie, res) {
  const options = {
    url: "http://akademik.uhamka.ac.id/Mhs/MhsKrs.aspx",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Cookie: "ASP.NET_Sessionid=" + cookie
    }
  };

  request(options, (error, response, html) => {
    if (!error && response.statusCode == 200) {
      const $ = cheerio.load(html);

      const table = $("#ctl00_ContentPlaceHolder1_GrvKRS")
        .text()
        .replace(/(<td>||<td.*>)((?:.(?!<\/td>))*.?)<\/td>/g)
        .replace(/\b\s/g, "_")
        .replace(/\s/g, "")
        .replace("NOKODE_MKNAMA_MKKELASSKSJADWAL_KULIAHRUANGDOSEN", "")
        .replace(/_\d*_/g, "_")
        .replace(/_Hapus/g, ",")
        .replace(/\./g, "__");

      let arr_table = table.split(",");
      arr_table.pop();

      let jadwal = Array();

      arr_table.forEach((item, index) => {
        let kode_matkul = item.match(/\d+/im);
        item = item.replace("_" + kode_matkul[0], "");

        let matkul = item.match(/^[A-z]+/m);
        item = item.replace(matkul[0], "");

        let kelas = item.match(/\d\w/im);
        item = item.replace(kelas[0], "");

        let sks = item.match(/\d/im);
        item = item.replace(sks[0], "");

        let hari = item.match(/[^_]+/m);
        item = item.replace(hari[0] + "_", "");

        let day_value = daysValue(hari);

        let jam = item.match(/\d{1,2}:\d{2}-\d{2}:\d{2}/m);
        item = item.replace(jam[0], "");

        let waktu = jam[0];
        waktu = waktu[0] + waktu[1];

        let ruang = item.match(/\w{2,6}\d{1,3}/m);
        item = item.replace(ruang[0], "");

        let dosen = item.replace(/__/g, ".").replace(/_/g, " ");

        let obj = {
          kode: kode_matkul[0],
          matkul: matkul[0].replace(/__/g, ".").replace(/_/g, " "),
          kelas: kelas[0],
          sks: sks[0],
          hari: hari[0],
          jam: jam[0],
          ruang: ruang[0],
          dosen: dosen
        };

        jadwal[index] = [day_value, parseInt(waktu), obj];
      });

      jadwal = jadwal.sort((a, b) => {
        return a[0] - b[0];
      });
      jadwal = jadwal.sort((a, b) => {
        if (a[0] == b[0]) return a[1] - b[1];
      });

      if (jadwal[0] == undefined) {
        res.status(404).json({
          status: "error",
          message: "Wrong credential"
        });
      } else {
        res.status(200).json({
          status: "success",
          data: jadwal
        });
      }
    } else {
      res.status(404).json({
        status: "error",
        message: "Something when wrong"
      });
    }
  });
}

function daysValue(day) {
  if (day == "Senin") return 1;
  else if (day == "Selasa") return 2;
  else if (day == "Rabu") return 3;
  else if (day == "Kamis") return 4;
  else if (day == "Jumat") return 5;
  else if (day == "Sabtu") return 6;
  else if (day == "Minggu") return 7;
  else return 0;
}
