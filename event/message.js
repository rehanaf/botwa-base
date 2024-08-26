import config from "../config.js"
import Func from "../lib/function.js"

import fs from "fs"
import chalk from "chalk"
import axios from "axios"
import path from "path"
import { getBinaryNodeChildren } from "@whiskeysockets/baileys"
import { exec } from "child_process"
import { format } from "util"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const __filename = Func.__filename(import.meta.url)
const require = createRequire(import.meta.url)

export default async function Message(bot, m, chatUpdate) {
  try {
    if (!m) return
    if (!config.options.public && !m.isOwner) return
    if (m.from && db.groups[m.from]?.mute && !m.isOwner) return
    if (m.isBaileys) return

    (await import("../lib/loadDatabase.js")).default(m)

    const prefix = m.prefix
    const isCmd = m.body.startsWith(prefix)
    const command = isCmd ? m.command.toLowerCase() : ""
    const quoted = m.isQuoted ? m.quoted : m

    // LOG Chat
    if (m.message && !m.isBaileys) {
      console.log(chalk.black(chalk.bgWhite("- FROM")), chalk.black(chalk.bgGreen(m.pushName)), chalk.black(chalk.yellow(m.sender)) + "\n" + chalk.black(chalk.bgWhite("- IN")), chalk.black(chalk.bgGreen(m.isGroup ? m.metadata.subject : "Private Chat", m.from)) + "\n" + chalk.black(chalk.bgWhite("- MESSAGE")), chalk.black(chalk.bgGreen(m.body || m.type)))
    }

    switch (command) {

      /* for main menu  */
      case "menu": case "reyzee": case "rehanaf": case "zetcoder": {
        let text = `Hi @${m.sender.split`@`[0]}, This is a list of available commands\n\n*Total Command :* ${Object.values(config.menu).map(a => a.length).reduce((total, num) => total + num, 0)}\n\n`

        Object.entries(config.menu).map(([type, command]) => {
          text += `┌──⭓ *${Func.toUpper(type)}*\n`
          text += `│\n`
          text += `│⎚ ${command.map(a => `${prefix + a}`).join("\n│⎚ ")}\n`
          text += `│\n`
          text += `└───────⭓\n\n`
        }).join('\n\n')

        return bot.sendMessage(m.from, {
          text, contextInfo: {
            mentionedJid: bot.parseMention(text),
            externalAdReply: {
              title: bot?.user?.name,
              mediaType: 1,
              previewType: 0,
              renderLargerThumbnail: true,
              thumbnail: fs.readFileSync("./temp/bot.jpg"),
              sourceUrl: config.Exif.packWebsite
            }
          }
        }, { quoted: m })
      }
        break
      case "owner": {
        bot.sendContact(m.from, config.options.owner, m)
      }
        break
      case "ping": {
        const moment = (await import("moment-timezone")).default
        const calculatePing = function (timestamp, now) {
          return moment.duration(now - moment(timestamp * 1000)).asSeconds();
        }
        m.reply(`*Ping :* *_${calculatePing(m.timestamp, Date.now())} second(s)_*`)
      }
        break
      case "sc": {
        m.reply("https://github.com/rehanaf/botwa-base")
      }
        break
      /* for owner menu  */
      // case "public": {
      //     if (!m.isOwner) return m.reply("owner")
      //     if (config.options.public) {
      //         config.options.public = false
      //         m.reply('Switch Bot To Self Mode')
      //     } else {
      //         config.options.public = true
      //         m.reply('Switch Bot To Public Mode')
      //     }
      // }
      // break
      // case "mute": {
      //     if (!m.isOwner) return m.reply("owner")
      //     let db = global.db.groups[m.from]
      //     if (db.mute) {
      //         db.mute = false
      //         m.reply("Succes Unmute This Group")
      //     } else if (!db.mute) {
      //         db.mute = true
      //         m.reply("Succes Mute This Group")
      //     }
      // }
      // break
      case "setpp": case "setprofile": case "seticon": {
        const media = await quoted.download()
        if (m.isOwner && !m.isGroup) {
          if (/full/i.test(m.text)) await bot.setProfilePicture(bot?.user?.id, media, "full")
          else if (/(de(l)?(ete)?|remove)/i.test(m.text)) await bot.removeProfilePicture(bot.decodeJid(bot?.user?.id))
          else await bot.setProfilePicture(bot?.user?.id, media, "normal")
        } else if (m.isGroup && m.isAdmin && m.isBotAdmin) {
          if (/full/i.test(m.text)) await bot.setProfilePicture(m.from, media, "full")
          else if (/(de(l)?(ete)?|remove)/i.test(m.text)) await bot.removeProfilePicture(m.from)
          else await bot.setProfilePicture(m.from, media, "normal")
        }
      }
        break
      case "setname": {
        if (m.isOwner && !m.isGroup) {
          await bot.updateProfileName(m.isQuoted ? quoted.body : quoted.text)
        } else if (m.isGroup && m.isAdmin && m.isBotAdmin) {
          await bot.groupUpdateSubject(m.from, m.isQuoted ? quoted.body : quoted.text)
        }
      }
        break

      /* for convert menu  */
      case "sticker": case "s": case "stiker": {
        if (/image|video|webp/i.test(quoted.mime)) {
          const buffer = await quoted.download()
          if (quoted?.msg?.seconds > 10) return m.reply(`Max video 9 abad`)
          let exif
          if (m.text) {
            let [packname, author] = m.text.split("|")
            exif = { packName: packname ? packname : "", packPublish: author ? author : "" }
          } else {
            exif = { ...config.Exif }
          }
          m.reply(buffer, { asSticker: true, ...exif })
        } else if (m.mentions[0]) {
          let url = await bot.profilePictureUrl(m.mentions[0], "image");
          m.reply(url, { asSticker: true, ...config.Exif })
        } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg|webp|mov|mp4|webm|gif))/i.test(m.text)) {
          m.reply(Func.isUrl(m.text)[0], { asSticker: true, ...config.Exif })
        } else {
          m.reply(`gambar-nya mana?`)
        }
      }
        break
      case "toimg": case "toimage": {
        let { webp2mp4File } = (await import("../lib/sticker.js"))
        if (!/webp/i.test(quoted.mime)) return m.reply(`Reply Sticker with command ${prefix + command}`)
        if (quoted.isAnimated) {
          let media = await webp2mp4File((await quoted.download()))
          await m.reply(media)
        }
        let media = await quoted.download()
        await m.reply(media, { mimetype: "image/png" })
      }
        break

      /* for group menu  */
      case "hidetag": case "ht": {
        if (m.isAdmin || m.isOwner) {
          if (!m.isGroup) return m.reply("group")
          let mentions = m.metadata.participants.map(a => a.id)
          let mod = await bot.cMod(m.from, quoted, /hidetag|tag|ht|h|totag/i.test(quoted.body.toLowerCase()) ? quoted.body.toLowerCase().replace(prefix + command, "") : quoted.body)
          bot.sendMessage(m.from, { forward: mod, mentions })
        }
      }
        break
      case "tagall": case "tag": {
        if (m.isAdmin || m.isOwner) {
          if (!m.isGroup) return m.reply("group")
          let text = `┌──⭓ *Tag all*\n`
          text += `│\n`
          for (let mem of m.metadata.participants) {
            text += `│⎚ @${mem.id.split('@')[0]}\n`
          }
          text += `│\n`
          text += `└───────⭓\n`
 
          return bot.sendMessage(m.from, {
            text, contextInfo: {
              mentionedJid: bot.parseMention(text)
            }
          }, { quoted: m })
        }
      }
        break
      case "add": case "+": {
        if (m.isGroup && m.isAdmin && m.isBotAdmin) {
          let users = m.mentions.length !== 0 ? m.mentions.slice(0, 2) : m.isQuoted ? [m.quoted.sender] : m.text.split(",").map(v => v.replace(/[^0-9]/g, '') + "@s.whatsapp.net").slice(0, 2)
          if (users.length == 0) return m.reply('Fuck You 🖕')
          await bot.groupParticipantsUpdate(m.from, users, "add")
            .then(async (res) => {
              for (let i of res) {
                if (i.status == 403) {
                  let node = getBinaryNodeChildren(i.content, "add_request")
                  await m.reply(`Can't add @${i.jid.split('@')[0]}, send invitation...`)
                  let url = await bot.profilePictureUrl(m.from, "image").catch(_ => "https://lh3.googleusercontent.com/proxy/esjjzRYoXlhgNYXqU8Gf_3lu6V-eONTnymkLzdwQ6F6z0MWAqIwIpqgq_lk4caRIZF_0Uqb5U8NWNrJcaeTuCjp7xZlpL48JDx-qzAXSTh00AVVqBoT7MJ0259pik9mnQ1LldFLfHZUGDGY=w1200-h630-p-k-no-nu")
                  await bot.sendGroupV4Invite(i.jid, m.from, node[0]?.attrs?.code || node.attrs.code, node[0]?.attrs?.expiration || node.attrs.expiration, m.metadata.subject, url, "Invitation to join my WhatsApp Group")
                }
                else if (i.status == 409) return m.reply(`@${i.jid?.split('@')[0]} already in this group`)
                else m.reply(Func.format(i))
              }
            })
          }
        }
        break
      case "kick": case "remove": {
        if(m.isAdmin && m.isBotAdmin && m.isGroup) {
          let users = m.mentions.length !== 0 ? m.mentions.slice(0, 2) : m.isQuoted ? [m.quoted.sender] : m.text.split(",").map(v => v.replace(/[^0-9]/g, '') + "@s.whatsapp.net").slice(0, 2)
          if (users.length == 0) return m.reply('Fuck You 🖕')
          await bot.groupParticipantsUpdate(m.from, users, "remove")
        }
      }
        break
      case "promote": {
        if(m.isAdmin && m.isBotAdmin && m.isGroup) {
          let users = m.mentions.length !== 0 ? m.mentions.slice(0, 2) : m.isQuoted ? [m.quoted.sender] : m.text.split(",").map(v => v.replace(/[^0-9]/g, '') + "@s.whatsapp.net").slice(0, 2)
          if (users.length == 0) return m.reply('Fuck You 🖕')
          await bot.groupParticipantsUpdate(m.from, users, "promote")
        }
      }
        break
      case "demote": {
        if(m.isAdmin && m.isBotAdmin && m.isGroup) {
          let users = m.mentions.length !== 0 ? m.mentions.slice(0, 2) : m.isQuoted ? [m.quoted.sender] : m.text.split(",").map(v => v.replace(/[^0-9]/g, '') + "@s.whatsapp.net").slice(0, 2)
          if (users.length == 0) return m.reply('Fuck You 🖕')
          await bot.groupParticipantsUpdate(m.from, users, "demote")
        }
      }
        break
      case "welcome": {
          if (!m.isAdmin) return m.reply("admin")
          let db = global.db.groups[m.from]
          if (db.welcome) {
              db.welcome = false
              m.reply("Succes Deactive Welcome on This Group")
          } else if (!db.welcome) {
              db.welcome = true
              m.reply("Succes Activated Welcome on This Group")
          }
      }
      break
      case "leaving": {
          if (!m.isAdmin) return m.reply("admin")
          let db = global.db.groups[m.from]
          if (db.leave) {
              db.leave = false
              m.reply("Succes Deactive Leaving on This Group")
          } else if (!db.leave) {
              db.leave = true
              m.reply("Succes Activated Leaving on This Group")
          }
      }
      break
      case "linkgroup": case "linkgrup": case "linkgc": case "link": {
        if (!m.isGroup) return m.reply("group")
        if (!m.isAdmin) return m.reply("admin")
        if (!m.isBotAdmin) return m.reply("botAdmin")
        await m.reply("https://chat.whatsapp.com/" + (await bot.groupInviteCode(m.from)))
      }
        break
      case "join": {
        const code = m.text.replace('https://chat.whatsapp.com/', '')
        if (!m.isOwner) return m.reply("owner")
        if (m.isGroup) return m.reply("private")
          (await bot.groupAcceptInvite(code)) ? m.reply("done!") : m.reply("urlInvalid")
      }
        break
      case "leave": case "left": case "out": {
        if (m.isOwner && m.isGroup) {
          await m.reply("keluar dari grup...")
          await bot.groupLeave(m.from)
        }
      }
        break

      /* for tool menu  */
      case "ssweb": case "ssphone": case "sstab": case "sspdf": {
        if (!m.text) return m.reply(`Cara makenya gini cuy,\ncontoh: ${prefix + command} zetcoder.my.id`)
        await m.reply("wait")
        let req = await (await api("vhyt")).get(`/tools/${command}`, { url: m.text }, { responseType: "arraybuffer" })
        try { await m.reply(req) }
        catch { await m.reply("notFound") }
      }
        break
      // view once so easy bro 🤣
      case "rvo": {
        if (!quoted.msg.viewOnce) return m.reply(`Reply view once with command ${prefix + command}`)
        quoted.msg.viewOnce = false
        await bot.sendMessage(m.from, { forward: quoted }, { quoted: m })
      }
        break
      case "c": case "chatgpt": case "gpt": case "openai": {
        if (!m.text) return m.reply(`Cara makenya gini cuy,\ncontoh: ${m.prefix + m.command} bagaimana cara bertanya`)
        await m.reply("wait")
        let req = await (await api("vhyt")).get("/tools/chatgpt3", { q: m.text })
        if (req.status !== true) return m.reply('notFound')
        await m.reply(req.data)
      }
        break
      // case "aiimg": case "midjourney": {
      //     if (!m.text) return m.reply(`Cara makenya gini cuy,\ncontoh: ${m.prefix + m.command} rehan ganteng xixixi`)
      //     await m.reply("wait")
      //     let req = await (await api("vhyt")).get("/tools/midjourney", { q: m.text }, { responseType: "arraybuffer" })
      //     if (req.err) return m.reply("notFound")
      //     await m.reply(req)
      // }
      // break

      /* for non command */
      default:
        // ini eval ya dek
        if (m.isOwner) {
          if ([">", "eval", "=>"].some(a => m.body?.toLowerCase()?.startsWith(a))) {
            let evalCmd = ""
            try {
              evalCmd = /await/i.test(m.text) ? eval("(async() => { " + m.text + " })()") : eval(m.text)
            } catch (e) {
              evalCmd = e
            }
            new Promise(async (resolve, reject) => {
              try {
                resolve(evalCmd);
              } catch (err) {
                reject(err)
              }
            })
              ?.then((res) => m.reply(format(res)))
              ?.catch((err) => m.reply(format(err)))
          }

          // nah ini baru exec dek
          if (["$", "exec"].some(a => m.body?.toLowerCase()?.startsWith(a))) {
            try {
              exec(m.text, async (err, stdout) => {
                if (err) return m.reply(Func.format(err))
                if (stdout) return m.reply(Func.format(stdout))
              })
            } catch (e) {
              m.reply(Func.format(e))
            }
          }
        }
        // cek bot active or no
        if (/^.start/i.test(m.body)) {
          m.reply(`Bot is Active!`)
        }
    }
  } catch (e) {
    m.reply(format(e))
  }
}
