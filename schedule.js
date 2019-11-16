const fetch = require('node-fetch')
const $ = require('cheerio')
const moment = require('moment-timezone')
const fs = require('fs')
const util = require('util')

const url = process.env.BONJWA_SCHEDULE_URL || 'https://www.bonjwa.de/programm'

async function getSchedule () {
  const res = await fetch(url)
  const html = await res.text()

  const elements = $('.stream-plan > table > tbody > tr > td', html)

  const data = []

  elements.each((i, element) => {
    if (element.attribs.class && element.attribs.class.includes('free-streaming-slot')) return

    const content = $('p', element)
    const title = $(content[0]).text().trim()
    const caster = $(content[1]).text().trim()

    const startDate = moment.tz(`${element.attribs['data-date']} ${element.attribs['data-hour-start']}:00:00`, 'YYYY-MM-DD HH:mm:ss', 'Europe/Berlin')
    const endDate = moment.tz(`${element.attribs['data-date']} ${element.attribs['data-hour-end']}:00:00`, 'YYYY-MM-DD HH:mm:ss', 'Europe/Berlin')

    const cancelled = (element.attribs.class && element.attribs.class.includes('cancelled-streaming-slot')) || false

    data.push({
      title,
      caster,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      cancelled
    })
  })

  return data
}

async function getAndWriteSchedule () {
  try {
    console.log('Fetching schedule..')
    const schedule = await getSchedule()

    const mkdir = util.promisify(fs.mkdir)
    const writeFile = util.promisify(fs.writeFile)
    const copyFile = util.promisify(fs.copyFile)

    console.log('Checking if dist/api directory exists..')
    if (!fs.existsSync('dist/api/')) {
      console.log('Creating dist/api directory..')
      await mkdir('dist/api')
    }

    console.log('Writing schedule to file..')
    await writeFile('dist/api/schedule', JSON.stringify(schedule))

    console.log('Copying static/error to dist/api..')
    await copyFile('static/error', 'dist/api/error')

    console.log('Copying static/_headers to dist..')
    await copyFile('static/_headers', 'dist/_headers')
  } catch (e) {
    console.error(e)
  }
}

getAndWriteSchedule()
