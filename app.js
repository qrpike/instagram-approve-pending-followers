#!/usr/bin/env node

const lodash 		= require('lodash')
const Promise 		= require('bluebird')
const IgApiClient 	= require('instagram-private-api').IgApiClient
const ig 			= new IgApiClient()

var program = require('commander')
let session = null

const everyMinutes = 10
let intervalFunc = null

program
	.version('0.1.0')
	.option('-u, --username [username]', 'Username', '')
	.option('-p, --password [password]', 'Password', '')
	.parse( process.argv )

if( lodash.isEmpty( program.username ) || lodash.isEmpty( program.password ) ){
	throw(new Error('Must supply -u {username} and -p {password}'))
}

ig.state.generateDevice(program.username)

let pendingCount = 0
async function DoApprovals(){

	const pendFriend = ig.feed.pendingFriendships(session.pk)
	const pendFriendItems = await pendFriend.items()
	  
	console.log('Awaiting Approval: ', pendFriendItems.length)

	return Promise.mapSeries(pendFriendItems, async ( friend ) => {
		console.log('Approving: ', friend.username)
		const body = await ig.friendship.approve(friend.pk)
		return Promise.delay( randomIntFromInterval(350, 1450) )
	}).then(() => {
		if( pendFriendItems.length != 0 ){
			return DoApprovals()
		}
		setTimeoutContinue()
	}).catch(( err ) => {
		console.log('Do approvals error:', err)
		console.log('Waiting 11sec before starting again...')
		return Promise.delay(11500).then(() => {
			console.log('Starting again...')
			DoApprovals()
		})
	})

	// return Client.Relationship.pendingFollowers( session )
	// 	.then(( pendingFollowers ) => {
	// 		console.log('Pending Count:', pendingFollowers.length)
	// 		pendingCount = pendingFollowers.length
	// 		return Promise.mapSeries( pendingFollowers, ( pending ) => {
	// 			console.log('Approving:', pending._params.username)
	// 			return Promise.delay(1500).then( pending.approvePending.bind( pending ) )
	// 		}).then(() => {
	// 			if( pendingCount != 0 ){
	// 				console.log('Approvals done, still more so continue until pending = 0')
	// 				return DoApprovals()
	// 			}
	// 			setTimeoutContinue()
	// 		})
	// 	}).catch(( err ) => {
	// 		console.log('Do approvals error:', err)
	// 		console.log('Waiting 11sec before starting again...')
	// 		return Promise.delay(11500).then(() => {
	// 			console.log('Starting again...')
	// 			DoApprovals()
	// 		})
	// 	})
}

function randomIntFromInterval(min, max) { // min and max included 
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function setTimeoutContinue(){
	clearTimeout( intervalFunc )
	intervalFunc = setTimeout(() => {
		console.log('interval')
		DoApprovals().catch(( err ) => {
			console.log('Set timeouts error:', err)
			setTimeoutContinue()
		})
	}, 1000 * 60 * everyMinutes )
}


// Login and go
async function main(){

	await ig.simulate.preLoginFlow()

	ig.account.login(program.username, program.password)
		.then(( ses ) => {
			console.log(`Logged In! ${ses.username} - ${ses.full_name}`)
			process.nextTick(async () => await ig.simulate.postLoginFlow())
			session = ses
			DoApprovals().catch(( err ) => {
				console.log('Create sessions error:', err)
				setTimeoutContinue()
			})
		})
		.catch(( err ) => {
			console.log('err:', err)
		})
}

main()
